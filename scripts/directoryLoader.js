import {DirectoryLoader, UnknownHandling} from "langchain/document_loaders/fs/directory";

export default class CustomDirectoryLoader extends DirectoryLoader{
    async load() {
        const { readdir, extname, resolve } = await DirectoryLoader.imports();
        const files = await readdir(this.directoryPath, { withFileTypes: true });
        const documents = [];
        for (const file of files) {
            const fullPath = resolve(this.directoryPath, file.name);
            if (file.isDirectory()) {
                if (this.recursive) {
                    const loader = new DirectoryLoader(fullPath, this.loaders, this.recursive, this.unknown);
                    documents.push([...(await loader.load())]);
                }
            }
            else {
                // I'm aware some things won't be files,
                // but they will be caught by the "unknown" handling below.
                const loaderFactory = this.loaders[extname(file.name)];
                if (loaderFactory) {
                    const loader = loaderFactory(fullPath);
                    if(loader){
                        const fileDocuments = [...(await loader.load())]
                        fileDocuments.filePath = loader.filePathOrBlob
                        documents.push(fileDocuments);
                    }
                }
                else {
                    switch (this.unknown) {
                        case UnknownHandling.Ignore:
                            break;
                        case UnknownHandling.Warn:
                            console.warn(`Unknown file type: ${file.name}`);
                            break;
                        case UnknownHandling.Error:
                            throw new Error(`Unknown file type: ${file.name}`);
                        default:
                            throw new Error(`Unknown unknown handling: ${this.unknown}`);
                    }
                }
            }
        }
        return documents;
    }
}
