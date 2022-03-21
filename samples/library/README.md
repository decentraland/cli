## SDK Library

This project has the basics to start building your own library for using in Decentraland scenes.

The libraries in the [Awesome Repository](https://github.com/decentraland-scenes/Awesome-Repository#Libraries) are available for all to use. We encourage you to create and share your own as well, we'd love to see the community grow and start sharing more reusable solutions to common problems through libraries!

## Publish

See [Create Libraries]() for tips on how to design and develop your library, and for simple instructions for publishing it to NPM.

Below is a template to help you craft documentation for your library, so others know how to use it.

# MyAmazingLibrary Documentation

myAmazingLibrary includes helpful solutions for `< insert use case >` in a Decentraland scene.

## Install

To use any of the helpers provided by this library:

1. Install it as an npm package. Run this command in your scene's project folder:

   ```
   npm install myAmazingLibrary
   ```

2. Add this line at the start of your game.ts file, or any other TypeScript files that require it:

   ```ts
   import * as magic from 'myAmazingLibrary'
   ```

## Usage

### < use case 1 >

To do `< insert use case >`, add the `MyAmazingComponent` component to the entity.

MyAmazingComponent requires two arguments when being constructed:

- `start`: Vector3 for the start position
- `duration`: duration (in seconds)

MyAmazingComponent can optionally also take the following argument:

- `color`: Color4 value for the color. If not provided, the default value is `Color4.Red()`

This example uses MyAmazingComponent to do `< insert use case >` to an entity over a period of 2 seconds:

```ts
import * as magic from 'myAmazingLibrary'

// Create entity
const box = new Entity()

// Give entity a shape and transform
box.addComponent(new BoxShape())
box.addComponent(new Transform())

// Move entity
box.addComponent(new magic.MyAmazingComponent(new Vector3(1, 1, 1), 2))

// Add entity to engine
engine.addEntity(box)
```

> Note: Be aware that if < other use case >, MyAmazingComponent will < do some other thing >.

### < use case 2 >

...

## Copyright info

This scene is protected with a standard Apache 2 licence. See the terms and conditions in the [LICENSE](/LICENSE) file.
