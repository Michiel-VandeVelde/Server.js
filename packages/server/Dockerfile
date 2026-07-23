FROM node:22-slim
LABEL description="Triple Pattern Fragment Server."
# Install location
ENV dir /var/www/@ldf/server

# Copy the server files
# Note: bin/*.js and bin/*.d.ts are compiled output (gitignored) and must already
# exist in this build context; the monorepo-level `yarn install` (which runs the
# `prepare`/`build` scripts) produces them before this image is built.
COPY components ${dir}/components/
COPY config ${dir}/config/
COPY bin ${dir}/bin/
COPY package.json ${dir}

# Set the npm registry
ARG NPM_REGISTRY=https://registry.npmjs.org/
RUN npm config set @ldf:registry $NPM_REGISTRY

# Install the node module
RUN apt-get update && \
    apt-get install -y g++ make python3 && \
    cd ${dir}

WORKDIR ${dir}
RUN npm install --only=production
RUN apt-get remove -y g++ make python3 && apt-get autoremove -y && \
    rm -rf /var/cache/apt/archives

# Expose the default port
EXPOSE 3000

# Run base binary
ENTRYPOINT ["node", "bin/ldf-server"]

# Default command
CMD ["--help"]