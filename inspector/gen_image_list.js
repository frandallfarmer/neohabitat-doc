const fs = require('node:fs/promises');

if (process.argv.length != 3) {
    console.error("Usage: node gen_image_list.js [directory]")
    process.exit(1)
}
(async () => {
    let dirname = process.argv[2]
    if (dirname.endsWith("/")) {
        dirname = dirname.slice(0, -1)
    }
    const filenames = []
    for (const filename of (await fs.readdir(dirname))) {
        if (filename.endsWith(".bin")) {
            filenames.push(`${dirname}/${filename}`)
        }
    }
    filenames.sort()
    await fs.writeFile(`${dirname}.json`, JSON.stringify(filenames))    
})()