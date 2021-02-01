FROM node:buster

RUN apt-get update --fix-missing && \
    apt-get install -y curl cargo tini && \
    rm -rf /var/lib/apt/lists/*

# Non-root user for security purposes.
#
# UIDs below 10,000 are a security risk, as a container breakout could result
# in the container being ran as a more privileged user on the host kernel with
# the same UID.
#
# Static GID/UID is also useful for chown'ing files outside the container where
# such a user does not exist.
RUN groupadd --gid 10001 nonroot && \
    useradd  --home-dir /home/nonroot \
             --create-home \
             --shell /bin/bash \
             --gid nonroot \
             --groups nonroot \
             --uid 10000 nonroot


WORKDIR /home/nonroot/sub-flood
# Global npm dependencies
# https://github.com/nodejs/docker-node/blob/master/docs/BestPractices.md#global-npm-dependencies

COPY package.json package-lock.json tsconfig.json .
COPY src/ src/

# Script will be available at `/usr/local/lib/node_modules/sub-flood/dist/index.js`
RUN npm install  typescript
RUN npm install -g
# This will generate dist dir which is needed in order for the script to run
RUN npx tsc 


# Add gurke tool and it's dirs
WORKDIR /home/nonroot/gurke
# Add dependencY: gurke binary
COPY --from=paritytech/pickle_rick:latest /usr/local/bin/gurke                  /usr/local/bin/gurke
COPY --from=paritytech/pickle_rick:latest /usr/local/bin/kubectl                /usr/local/bin/kubectl
COPY --from=paritytech/pickle_rick:latest /home/nonroot/gurke/examples          examples 
COPY --from=paritytech/pickle_rick:latest /home/nonroot/gurke/features          features 
COPY --from=paritytech/pickle_rick:latest /home/nonroot/gurke/external-tools    external-tools
COPY --from=paritytech/pickle_rick:latest /home/nonroot/gurke/run-test-scripts  run-test-scripts 


RUN chown -R nonroot. /home/nonroot

# Use the non-root user to run our application
USER nonroot

WORKDIR /home/nonroot/gurke
# Tini allows us to avoid several Docker edge cases, see https://github.com/krallin/tini
ENTRYPOINT ["tini", "--"]
# Run your program under Tini
CMD ["/home/nonroot/gurke/run-test-scripts/run-gurke-external-tool-test.sh", "--container"]



# ### Run gurke inside a container at localhost
# 
# ### 1. make sure you can access the cluster with
# # kubectl get pods -n monitoring
# 
# ### Run the following cmds as described in the stackoverslow question
# ### https://stackoverflow.com/questions/48394610/connect-local-instance-of-kubectl-to-gke-cluster-without-using-gcloud-tool#48529378
# gcloud config set container/use_client_certificate True
# export CLOUDSDK_CONTAINER_USE_CLIENT_CERTIFICATE=True
# 
# ### make the nonroot user insided the container the owner of the local /home/${USER}/.kube
# sudo chown -R 10000:10000 /home/${USER}/.kube
# when you are done playing with the container you have to 
# sudo chown -R "${USER}." /home/${USER}/.kube
# 
# ### Mount kubeconfig file inside the container
# docker run -it --rm --name gurke -v /home/${USER}/.kube:/home/nonroot/.kube  paritytech/pickle_rick:latest spawn -c examples/default_local_testnet.toml
# 
# ### example of gurke cmd
# gurke spawn -c examples/default_local_testnet.toml
# gurke test "$namespace" features 
