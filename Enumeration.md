# Enumeration

Lists or enumerations, for example, a list of cuisines or music genres, etc.

## Properties

| Name                  | @id                                                      | Type                                                                                                         | Description                                   | Inherited from     |
| --------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------- | ------------------ |
| **type _(required)_** | [schema:type](https://schema.org/type)                   | `enum{`​`Enumeration`, `CitationIntentEnumeration`​`}`                                                       | The name of the type.                         | [Entity](./Entity) |
| alternateNames        | [schema:alternateName](https://schema.org/alternateName) | `array[`​`string`​`]`                                                                                        | Alternate names (aliases) for the item.       | [Thing](./Thing)   |
| description           | [schema:description](https://schema.org/description)     | `array[`​[`BlockContent`](./BlockContent)​`]` \| `array[`​[`InlineContent`](./InlineContent)​`]` \| `string` | A description of the item.                    | [Thing](./Thing)   |
| id                    | [schema:id](https://schema.org/id)                       | `string`                                                                                                     | The identifier for this item.                 | [Entity](./Entity) |
| identifiers           | [schema:identifier](https://schema.org/identifier)       | `array[`​[`PropertyValue`](./PropertyValue) \| `string`​`]`                                                  | Any kind of identifier for any kind of Thing. | [Thing](./Thing)   |
| images                | [schema:image](https://schema.org/image)                 | `array[`​[`ImageObject`](./ImageObject) \| `string:uri`​`]`                                                  | Images of the item.                           | [Thing](./Thing)   |
| meta                  | [stencila:meta](https://schema.stenci.la/meta.jsonld)    | `object`                                                                                                     | Metadata associated with this item.           | [Entity](./Entity) |
| name                  | [schema:name](https://schema.org/name)                   | `string`                                                                                                     | The name of the item.                         | [Thing](./Thing)   |
| url                   | [schema:url](https://schema.org/url)                     | `string:uri`                                                                                                 | The URL of the item.                          | [Thing](./Thing)   |

## Related

-   Parent: [Thing](./Thing)
-   Descendants: [CitationIntentEnumeration](./CitationIntentEnumeration)

 This documentation was autogenerated from [`Enumeration.schema.yaml`](https://github.com/stencila/schema/blob/master/schema/Enumeration.schema.yaml). This type is also available in [JSON-LD](https://schema.org/Enumeration) and [JSON Schema](https://schema.stenci.la/Enumeration.schema.json).