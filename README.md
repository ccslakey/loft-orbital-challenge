# Loft FE Coding Challenge

## Challenge description

Your mission, should you choose to accept it, is to build a front-end web application based on a custom GraphQL API. The API exposes information about a company, like Loft Orbital, that licenses ride-share missions to organizations.

Here's some insider information on the satellite company's business practices...

The satellite company's customers provide payloads that are integrated into the satellite bus and then launched into space via a third party like SpaceX. A satellite can support many payloads across a variety of customers. Multiple satellites and their payloads can even work in tandem to achieve some common goal; this concept is called a "constellation". Customers can then request that a representative of the satellite company make contact with the satellite to execute some task with their payloads. Contact with the satellite is achieved by directing contracted ground stations to communicate with the satellite via a large antennae array. Satellite employees also often need to make contact with a satellite for general maintenancing tasks. Satellite company employees can create reports and comment about ongoing events with the satellites and/or ground stations.

**Your objective is to provide a user-friendly application with a variety of interesting features that allows the satellite company to help manage it's fleet of space assets.** This is a creative exercise, so there are no specific features that are explicitly required and you are encouraged to make any technical assumptions on your own. Just make sure to document your decisions!

We understand that this is a large task, which is why this is the only technical challenge for our interview process. There are no whiteboard problems and no in person quizzes! We'll just walk through your submission and talk about your code and decisions made along the way.

## Requirements

These are requirements that we must have in a submission. Consider the following mission critical items.

- Create a web application with good UI/UX. The more creative, the better!
- The web app must be created using Vue or React.
- Stay away from plain JavaScript, only use if absolutely necessary. Favor using TypeScript.
- Include tests for the business logic parts of your application. A basic Vitest configuration is already provided.
- Make sure your application runs and fix any bugs you may find.
- Use the provided custom GraphQL API schema.
- Update the `README's` within this template to detail the chosen solution and how to run it.
- Include a `WORK_SUMMARY.md` file at the root of your submission to detail what you did and how. Include any details that you may think are important for us to know about, especially any changes that you might have made to this project template.

## AI Usage Policy

- In your README, include a short section on if and how you used AI tools to solve the challenge.
- You can use AI to assist, but the core logic, architecture, and key design decisions should be your own work, not fully agent-generated.

## Recommendations

These are opportunities to show your technical expertise. They are not required, but we do give bonus points to those who can create a submission with the following.

- Use other technology or APIs to make your project creative and feature rich.
- Use state management for your application and/or discuss your approach to state management in a front-end application.
- Use a component library of your choice.
- Add error handling to your API requests.
- Prefer use of SCSS or plain CSS over Tailwind or other predefined classes. It's easier to evaluate CSS skills this way!
- Make your web application a [SPA](https://developer.mozilla.org/en-US/docs/Glossary/SPA) using `vue-router` or `react-router` or another equivalent package.
- Use [Codegen](https://the-guild.dev/graphql/codegen) to generate typed GraphQL schema definitions/queries/mutations for use in the client.
- Use [Apollo](https://www.apollographql.com/docs/#for-client-developers), [urql](https://github.com/urql-graphql/urql), or some equivalent for requesting and caching data in the client.
- Use linting and formatting tools like [ESLint](https://eslint.org/), [Stylelint](https://stylelint.io/), and [Prettier](https://prettier.io/) to ensure your code is free of code smells and has consistent formatting.
- Modify the Makefiles, Dockerfiles, and dashboard build process to additionally provide a runnable production-ready image.
- Set up a CI pipeline for unit testing (GitLab CI, Travis CI, Circle CI, etc).

## Not recommended

These are things we are not necessarily looking for (but would enjoy to see) because we realize that it would take a lot of time to implement.

- Don't put a lot of effort into accessibility. The UI/UX should only be reasonably accessible, i.e. don't put white text on a white background, but also don't spend time trying to make you application screen-reader accessible.
- Don't feel like you need to make changes to the server and API schema. Only do so if you think it will help improve the quality of your project.
- Don't worry about implementing best practicies around authentication and authorization in your app's feature set.

## Architecture

Nothing about this project setup needs to be used unless mentioned in the `requirements` section above!

We have already provided:

- the API server code for you in the `apps/server` directory
- a simple boilerplate web application at `apps/dashboard`
- a `Makefile` for easy startup
- a `Dockerfile` to make the developer environment consistent
- basic testing configuration using Vitest and JSDom
- basic linting and formatting configurations using ESLint and Prettier

Feel free to use all of this as a starting point for your submission.

## Getting started with this template

1. Install [pnpm](https://pnpm.io/). See [here](https://pnpm.io/installation) for instructions.
2. Make sure you have [Docker](https://www.docker.com/) installed. See [here](https://docs.docker.com/engine/install/) for instructions.
3. Start the Docker development environment using `make dev`.
4. Install dependencies using `pnpm install`.

## Common problems

- `ERR_PNPM_ENOENT  ENOENT: no such file or directory` --> `pnpm` is getting symlinks confused. Try running `pnpm config set store-dir ~/pnpm` from inside the Docker container to reset your cached dependencies. See more [here](https://github.com/pnpm/pnpm/issues/3952).

## Questions?

Just reach out!

## Next steps

It's time to submit!

But before you do that...

1. Ensure you meet all the requirements listed above.
2. Make sure your code runs in `dev` mode and builds without errors. See project `README.md` for more details.
3. Check your code for bugs, formatting inconsistencies, and code smells.
4. Remove all temporary files from your submission. Please refrain from submitting build ouput, installed dependencies, etc. This can mostly be handled by running `make clean` from the project root.

When you are done, please push your solution on a private GitLab or private GitHub repository (or in a zip and send it by email) and email us. We will then plan a short call so you can drive us through your solution.
