export default function flatMap<T, U>(list: Array<T>, map: (item: T) => Array<U>): Array<U> {
  return list.reduce((memo, item) => memo.concat(map(item)), [] as Array<U>);
}
