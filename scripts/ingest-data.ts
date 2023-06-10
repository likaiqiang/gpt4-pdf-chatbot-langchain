import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { FaissStore } from "langchain/vectorstores/faiss";
import { HttpsProxyAgent } from 'https-proxy-agent';
import {Document} from "langchain/document";
import {filePath} from '@/utils/file'


function makeDocuments(documents: Document[]){
  return documents.map(document=>{
    const {metadata,pageContent} = document
    return new Document({
      metadata,
      pageContent: pageContent.replace(/\n/g,'')
    })
  })
}


export const run = async () => {
  try {
    /*load raw docs from the all files in the directory */
    const directoryLoader = new DirectoryLoader(filePath, {
      '.pdf': (path) => new PDFLoader(path),
    });

    // const loader = new PDFLoader(filePath);
    const rawDocs = await directoryLoader.load();

    /* Split text into chunks */
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const docs = makeDocuments(
        await textSplitter.splitDocuments(rawDocs)
    )
    console.log('split docs', docs);

    console.log('creating vector store...');

    const vectorStore = await FaissStore.fromDocuments(docs,new OpenAIEmbeddings({},{
      baseOptions:{
        proxy: false,
        httpAgent: new HttpsProxyAgent('http://127.0.0.1:7890'),
        httpsAgent: new HttpsProxyAgent('http://127.0.0.1:7890')
      }
    }))
    // await vectorStore.addDocuments(docs);

    await vectorStore.save(`${filePath}/index2`);

  } catch (error) {
    console.log('error', error);
    throw new Error('Failed to ingest your data');
  }
};

(async () => {
  await run();
  console.log('ingestion complete');
})();
