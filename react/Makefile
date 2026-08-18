project_name := challenge

image_base := loft-orbital/$(project_name)
dev_image_url := $(image_base)/dev
prod_image_url := $(image_base)/prod

# Development Image ////////////////////////////////////////////////////////////////////////////////////////////////// #

dev: dev-image up exec ## Build and start development environment
.PHONY: dev

dev-image: ## Build development image
	docker build \
		--build-arg=USER_UID=$(shell id -u) \
		--build-arg=USER_GID=$(shell id -g) \
		--target=dev \
		--tag=$(dev_image_url) \
		.
.PHONY: dev-image

up: ## Start development environment
	docker network create loft || true
	docker compose \
		--project-name=$(project_name) \
		--file="$(CURDIR)/docker-compose.yml" \
		up -d
.PHONY: up

down: ## Stop development environment
	docker compose \
		--project-name=$(project_name) \
		--file="$(CURDIR)/docker-compose.yml" \
		down
.PHONY: down

exec: up ## Execute shell within development environment
	docker compose \
		--project-name=$(project_name) \
		--file="$(CURDIR)/docker-compose.yml" \
		exec \
		$(project_name) \
		zsh
.PHONY: exec

# General //////////////////////////////////////////////////////////////////////////////////////////////////////////// #

clean: ## Remove temporary files from the project
	find . -type d -name "build" -exec rm -rf {} +
	find . -type d -name "dist" -exec rm -rf {} +
	find . -type d -name "node_modules" -exec rm -rf {} +
	find . -type d -name ".pnpm-store" -exec rm -rf {} +
	find . -type f -name "coverage" -exec rm -rf {} +
	find . -type f -name "report" -exec rm -rf {} +
	find . -type d -name ".turbo" -exec rm -rf {} +
	find . -type f -name ".tsbuildinfo" -exec rm -rf {} +
	pnpm config set store-dir ~/pnpm 
.PHONY: clean

help: ## Show help
	@grep -E '^[0-9a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
.PHONY: help

# Variables ////////////////////////////////////////////////////////////////////////////////////////////////////////// #

.EXPORT_ALL_VARIABLES:
DOCKER_BUILDKIT = 1
COMPOSE_DOCKER_CLI_BUILD = 1
COMPOSE_PROJECT_NAME := $(project_name)

.DEFAULT_GOAL := help