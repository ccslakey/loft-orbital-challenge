FROM mcr.microsoft.com/vscode/devcontainers/typescript-node:20-bullseye as dev

RUN npm un -g pnpm \
    && corepack enable

ARG USERNAME="node"
ARG USER_UID="1000"
ARG USER_GID=${USER_UID}

RUN getent group ${USER_GID} || groupmod --gid ${USER_GID} ${USERNAME} \
    && usermod --uid ${USER_UID} --gid ${USER_GID} ${USERNAME} \
    && chown -R ${USER_UID}:${USER_GID} /home/${USERNAME}

USER ${USERNAME}

EXPOSE 8080
