FROM paritytech/pickle_rick:latest as gurke
USER root
WORKDIR /root

COPY --from=gurke /home/nonroot/gurke /home/nonroot/gurke

RUN apt-get update --fix-missing && \
    apt-get install -y nodejs npm

RUN npm i npm@latest -g


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

RUN chown -R nonroot. /home/nonroot

# Use the non-root user to run our application
USER nonroot

WORKDIR /home/nonroot/gurke
# Tini allows us to avoid several Docker edge cases, see https://github.com/krallin/tini
ENTRYPOINT ["tini", "--", "bash"]
# Run your program under Tini

# ### Run gurke inside a container at localhost
# 1. Download service account key from 1password -> Simnet-Team -> gurke-service-key.json

# 2. Place the key the a dir that the you will mount in the container 
# sudo mkdir -p /etc/gurke-container
# cp gurke-service-key.json /etc/gurke-container

# 3. Change ownership of key dir to match the nonroot user in the container
# sudo chown -R 10000:10000 /etc/gurke-container

# 4. Finally you can run a test like so
# docker run  --rm --name gurke  \
#             -v /etc/gurke-container/:/etc/gurke/ \
#             --device /dev/fuse   \
#             --privileged   \
#              paritytech/pickle_rick:latest  \
#                 ./run-test-scripts/run-gurke-test.sh --container --testdir=features

