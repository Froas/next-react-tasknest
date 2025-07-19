type CamelToSnakeCase<S extends string> = S extends `${infer T}${infer U}`
  ? `${T extends Capitalize<T> ? '_' : ''}${Lowercase<T>}${CamelToSnakeCase<U>}`
  : S

type CamelToSnakeCaseKeys<T> = {
  [K in keyof T as CamelToSnakeCase<string & K>]: T[K] extends object
    ? CamelToSnakeCaseKeys<T[K]>
    : T[K];
}

function camelToSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

export function convertKeysToSnakeCase<T extends Record<string, any>>(obj: T): CamelToSnakeCaseKeys<T> {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj as any
  }

  const result: any = {}

  Object.keys(obj).forEach((key) => {
    const snakeKey = camelToSnakeCase(key)
    const value = obj[key]

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[snakeKey] = convertKeysToSnakeCase(value)
    }
    else {
      result[snakeKey] = value
    }
  })

  return result
}
