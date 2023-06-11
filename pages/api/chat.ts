import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { makeChain } from '@/utils/makechain';
import {FaissStore} from "langchain/vectorstores/faiss";
import path from 'path'
import {filePath,outputFilePath} from '@/utils/file'
import {HttpsProxyAgent} from "https-proxy-agent";

/* Name of directory to retrieve your files from
   Make sure to add your PDF files inside the 'docs' folder
*/

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { question, history, resource_name} = req.body;

  console.log('question', question);
  console.log('resource_name', resource_name);

  //only accept post requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if(!resource_name){
    return res.status(400).json({ message: 'No resource_name in the request' });
  }
  if (!question) {
    return res.status(400).json({ message: 'No question in the request' });
  }
  // OpenAI recommends replacing newlines with spaces for best results
  const sanitizedQuestion = question.trim().replaceAll('\n', ' ');

  try {

    /* create vectorstore*/
    const loadedVectorStore = await FaissStore.load(
        `${outputFilePath}${path.sep}${resource_name}`,
        new OpenAIEmbeddings({},{
          baseOptions:{
            proxy: false,
            httpAgent: new HttpsProxyAgent('http://127.0.0.1:7890'),
            httpsAgent: new HttpsProxyAgent('http://127.0.0.1:7890')
          }
        })
    );

    //create chain
    const chain = makeChain(loadedVectorStore);
    //Ask a question using chat history
    const response = await chain.call({
      question: sanitizedQuestion,
      chat_history: history || [],
    });

    console.log('response', response);
    res.status(200).json(response);
  } catch (error: any) {
    console.log('error', error);
    res.status(500).json({ error: error.message || 'Something went wrong' });
  }
}
