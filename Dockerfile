FROM paritytech/pickle_rick:latest
USER root
WORKDIR /root

COPY --from=paritytech/pickle_rick:latest /home/nonroot/gurke /home/nonroot/gurke

# install nodejs 14.0 or >
# https://github.com/nodesource/distributions/blob/master/README.md#installation-instructions
RUN curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
# install the Yarn package manager, copatible with nodejs 14 or >
RUN curl -sL https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list
RUN apt-get update --fix-missing && \
    apt-get install -y nodejs yarn


WORKDIR /home/nonroot/sub-flood
# Global npm dependencies
# https://github.com/nodejs/docker-node/blob/master/docs/BestPractices.md#global-npm-dependencies

COPY package.json package-lock.json tsconfig.json .
COPY src/ src/

# Script will be available at `/usr/local/lib/node_modules/sub-flood/dist/index.js`
RUN npm install  typescript
# This will generate dist dir which is needed in order for the script to run
RUN npm run build  
# place index.js in a place where gurke expects it
RUN ln -s "$(pwd)"/dist/index.js /usr/local/bin/sub-flood

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
