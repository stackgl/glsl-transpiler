export default function clean(str) {
  if (Array.isArray(str)) str = String.raw.apply(String, arguments)

  return str.trim()

    //remove empty lines
    .replace(/^\s*\n/gm, '')

    //remove indentation/tabulation
    .replace(/^\s*/gm, '')

    //transform all \r to \n
    .replace(/[\n\r]+/g, '\n')

    //replace duble spaces/tabs to single ones
    .replace(/(\s)\s+/g, '$1')
}
