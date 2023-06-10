import type {NextApiRequest, NextApiResponse} from 'next';
import path from 'path'
import fs from 'fs'
import {filePath} from '@/utils/file'

/* Name of directory to retrieve your files from
   Make sure to add your PDF files inside the 'docs' folder
*/

export function findSubfoldersWithFiles(rootFolder:string = filePath) {
    const subfolders = fs.readdirSync(rootFolder, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    return subfolders.filter(subfolder => {
        const docstorePath = path.join(rootFolder, subfolder, 'docstore.json');
        const faissIndexPath = path.join(rootFolder, subfolder, 'faiss.index');
        return fs.existsSync(docstorePath) && fs.existsSync(faissIndexPath);
    });
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
        const matchingSubfolders = findSubfoldersWithFiles(filePath);

        console.log('response', matchingSubfolders);
        res.status(200).json(matchingSubfolders);
    } catch (error: any) {
        console.log('error', error);
        res.status(500).json({ error: error.message || 'Something went wrong' });
    }
}
