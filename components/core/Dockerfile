FROM node:alpine

# Kubectl
# Download with wget, so docker caches the command and does not redownload. The release it not going to change.
RUN wget --directory-prefix=/usr/local/bin/ https://storage.googleapis.com/kubernetes-release/release/v1.10.2/bin/linux/amd64/kubectl
# Alternatives
# ADD https://storage.googleapis.com/kubernetes-release/release/v1.10.2/bin/linux/amd64/kubectl /usr/local/bin/kubectl #redownloads every time

ENV HOME=/config

RUN set -x && \
    apk add --no-cache curl ca-certificates && \
    chmod +x /usr/local/bin/kubectl && \
    \
    # Create non-root user (with a randomly chosen UID/GUI).
#    adduser kubectl -Du 2342 -h /config && \
    \
    # Basic check it works.
    kubectl version --client

#USER kubectl

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install --only=production

# Bundle app source
COPY index.js ./
COPY resources resources
COPY modules modules

CMD node . $ARGS
