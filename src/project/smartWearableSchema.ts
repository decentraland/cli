import {
  generateLazyValidator,
  JSONSchema,
  Rarity,
  ValidateFunction,
  Wearable,
  WearableCategory,
  WearableRepresentation
} from '@dcl/schemas'

export type SmartWearable = Pick<Wearable, 'data' | 'name' | 'description'> & {
  rarity: Rarity
}

export namespace SmartWearable {
  export const schema: JSONSchema<SmartWearable> = {
    type: 'object',
    properties: {
      description: {
        type: 'string'
      },
      rarity: {
        ...Rarity.schema,
        nullable: true
      },
      name: {
        type: 'string'
      },
      data: {
        type: 'object',
        properties: {
          replaces: {
            type: 'array',
            items: WearableCategory.schema
          },
          hides: {
            type: 'array',
            items: WearableCategory.schema
          },
          tags: {
            type: 'array',
            items: {
              type: 'string',
              minLength: 1
            }
          },
          representations: {
            type: 'array',
            items: WearableRepresentation.schema,
            minItems: 1
          },
          category: WearableCategory.schema
        },
        required: ['replaces', 'hides', 'tags', 'representations', 'category']
      }
    },
    additionalProperties: true,
    required: ['description', 'name', 'data']
  }

  export const validate: ValidateFunction<SmartWearable> =
    generateLazyValidator(schema)
}
