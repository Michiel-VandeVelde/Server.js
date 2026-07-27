FROM node:22-slim
LABEL description="Triple Pattern Fragment Server."
# Install location
ENV dir=/var/www/@ldf/server

# Copy the server files
# Note: once this package's bin scripts are converted to TypeScript, bin/*.js and
# bin/*.d.ts become compiled output (gitignored) that must already exist in this
# build context — the CI docker job runs `yarn run build` at the repo root before
# invoking this Dockerfile for exactly that reason.
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