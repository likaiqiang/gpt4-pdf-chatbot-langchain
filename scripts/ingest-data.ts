import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import CustomDirectoryLoader from './directoryLoader.js';
import { FaissStore } from "langchain/vectorstores/faiss";
import { HttpsProxyAgent } from 'https-proxy-agent';
import {Document} from "langchain/document";
import {filePath, outputFilePath} from '@/utils/file'
import fs from "fs";
import path from "path";


function makeDocuments(documents: Document[]){
  return documents.map(document=>{
    const {metadata,pageContent} = document
    return new Document({
      metadata,
      pageContent: pageContent.replace(/\n/g,'')
    })
  })
}

function isIndexExist(indexName?:string){
  if(!indexName) return false
  // 获取docs文件夹下所有文件夹的名称
  const folders = fs.readdirSync(outputFilePath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

  // 遍历每个文件夹，检查是否符合要求
  for (const folder of folders) {
    if (folder === indexName) {
      const folderPath = path.join(outputFilePath, folder);
      // 检查文件夹中是否包含faiss.index和docstore.json
      if (fs.existsSync(path.join(folderPath, 'faiss.index')) && fs.existsSync(path.join(folderPath, 'docstore.json'))) {
        return true;
      }
    }
  }
  return false;
}


export const run = async () => {
  try {
    /*load raw docs from the all files in the directory */
    const directoryLoader = new CustomDirectoryLoader(filePath, {
      // @ts-ignore
      '.pdf': (p) => {
        const fileName = p.split(path.sep).pop()
        const indexName = fileName?.split('.')[0]
        if(isIndexExist(indexName)) return null
        return new PDFLoader(p)
      }
    });

    // const loader = new PDFLoader(filePath);
    const rawDocsArray = await directoryLoader.load();

    for(let rawDocs of rawDocsArray){
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      const docs = makeDocuments(
          await textSplitter.splitDocuments(rawDocs)
      )
      console.log('split docs', docs);

      console.log('creating vector store...');
      /* Split text into chunks */


      const vectorStore = await FaissStore.fromDocuments(docs,new OpenAIEmbeddings({},{
        baseOptions:{
          proxy: false,
          httpAgent: new HttpsProxyAgent('http://127.0.0.1:7890'),
          httpsAgent: new HttpsProxyAgent('http://127.0.0.1:7890')
        }
      }))
      // await vectorStore.addDocuments(docs);
      // @ts-ignore
      const name = path.parse(rawDocs.filePath.split(path.sep).pop()).name
      await vectorStore.save(`${outputFilePath}${path.sep}${name}`);
    }


  } catch (error) {
    console.log('error', error);
    throw new Error('Failed to ingest your data');
  }
};

(async () => {
  await run();
  console.log('ingestion complete');
})();
