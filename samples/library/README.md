## SDK Library
This project has the basics to start building your own library for scenes.
Just like we have https://github.com/decentraland/decentraland-ecs-utils, we would love to see our community grow and start sharing components, systems, etc.

## How to publish your library.
### Package Name
Don't forget to update your package name at `package.json`. Thats the name that will be publish on npm.
### GITHUB REPOSITORY
Create a public github repository, so you can get access to github actions runners.
We are going to use github actions to publish a new version of the package on every push to `main`.
In order to do this, we need to create a NPM_TOKEN with publish access.
### NPM TOKEN
To publish this package as a npm package, you need to have an account at https://www.npmjs.com/.
Once you have your account created, Go to Account -> Access Token -> Generate new Token -> Publish permissions.
Copy that token, go to your github repository settings and add the secret environment key `NPM_TOKEN` with the value you just copied.

Once you have setted the NPM_TOKEN on your github repository, you can force a push to main and the package will be published.
That's it. Now you can go to your scene and run `npm i package-name`, and run `dcl start`.

