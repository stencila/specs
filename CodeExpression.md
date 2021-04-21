# CodeExpression

An expression defined in programming language source code.

## Properties

| Name                  | @id                                                                  | Type                                    | Description                                                       | Inherited from                     |
| --------------------- | -------------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------- | ---------------------------------- |
| **text _(required)_** | [schema:text](https://schema.org/text)                               | `string`                                | The text of the code.                                             | [Code](./Code)                     |
| **type _(required)_** | [schema:type](https://schema.org/type)                               | `enum{`​`CodeExpression`​`}`            | The name of the type.                                             | [Entity](./Entity)                 |
| errors                | [stencila:errors](https://schema.stenci.la/errors.jsonld)            | `array[`​[`CodeError`](./CodeError)​`]` | Errors when compiling or executing the chunk.                     | [CodeExpression](./CodeExpression) |
| format                | [schema:encodingFormat](https://schema.org/encodingFormat)           | `string`                                | Media type, typically expressed using a MIME format, of the code. | [Code](./Code)                     |
| id                    | [schema:id](https://schema.org/id)                                   | `string`                                | The identifier for this item.                                     | [Entity](./Entity)                 |
| meta                  | [stencila:meta](https://schema.stenci.la/meta.jsonld)                | `object`                                | Metadata associated with this item.                               | [Entity](./Entity)                 |
| output                | [stencila:output](https://schema.stenci.la/output.jsonld)            | [`Node`](./Node)                        | The value of the expression when it was last evaluated.           | [CodeExpression](./CodeExpression) |
| programmingLanguage   | [schema:programmingLanguage](https://schema.org/programmingLanguage) | `string`                                | The programming language of the code.                             | [Code](./Code)                     |

## Related

-   Parent: [CodeFragment](./CodeFragment)
-   Descendants: None

 This documentation was autogenerated from [`CodeExpression.schema.yaml`](https://github.com/stencila/schema/blob/master/schema/CodeExpression.schema.yaml). This type is also available in [JSON-LD](https://schema.stenci.la/CodeExpression.jsonld) and [JSON Schema](https://schema.stenci.la/CodeExpression.schema.json).