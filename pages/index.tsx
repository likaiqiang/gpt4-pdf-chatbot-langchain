import {useRef, useState, useEffect, useMemo} from 'react';
import Layout from '@/components/layout';
import styles from '@/styles/Home.module.css';
import { Message } from '@/types/chat';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import LoadingDots from '@/components/ui/LoadingDots';
import { Document } from 'langchain/document';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import DataFor from "@/components/DataFor";
import Whether, {Else, If} from "@/components/Whether";
import { useImmer } from "use-immer";
import useLocalStorage from "@/utils/useLocalStorage";
import cloneDeep from "lodash.clonedeep"
import {useLatest, useMemoizedFn} from "ahooks";
import {findSubfoldersWithFiles} from '@/pages/api/get_resources'

export default function Home(props:Props) {
  console.log('props',props)
  const {resources} = props
  const [query, setQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex,setActive] = useState(resources.activeIndex)
  // const [messageState, setMessageState] = useState<{
  //   messages: Message[];
  //   history: [string, string][];
  //   pendingSourceDocs?: Document[];
  // }>({
  //   messages: [
  //     {
  //       message: 'Hi, what would you like to learn about this document?',
  //       type: 'apiMessage',
  //     },
  //   ],
  //   history: [],
  // });



  const [cache,setCache] = useLocalStorage('chat-cache',{})
  const cacheRef = useLatest(cache)
  const curResourceName = resources.list[activeIndex]


  const messageListRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const initCacheByName = useMemoizedFn((name:string)=>{
    if(!cacheRef.current[name]){
      setCache({
        ...cache,
        [name]: {
          messages: [
            {
              message: 'Hi, what would you like to learn about this document?',
              type: 'apiMessage',
            },
          ],
          history: []
        }
      })
    }
  })


  useEffect(() => {
    textAreaRef.current?.focus();
    const name = resources.list[activeIndex]
    initCacheByName(name)
  }, [resources]);

  //handle form submission

  const handleSubmit = useMemoizedFn( async (e)=>{
    e.preventDefault();

    setError(null);
    if(resources.list.length === 0){
      return alert("Please upload a resource first")
    }
    if (!query) {
      alert('Please input a question');
      return;
    }

    const question = query.trim();
    const newCache = cloneDeep(cacheRef.current)

    newCache[curResourceName].messages.push({
      type: 'userMessage',
      message: question
    })
    setCache(newCache)

    setLoading(true);
    setQuery('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          history,
          resource_name: resources.list[activeIndex]
        }),
      });
      const data = await response.json();
      console.log('data', data);

      if (data.error) {
        setError(data.error);
      } else {
        const newCache = cloneDeep(cacheRef.current)
        newCache[curResourceName].messages.push({
          type: 'apiMessage',
          message: data.text,
          sourceDocs: data.sourceDocuments
        })

        newCache[curResourceName].history.push([
          question, data.text
        ])
        setCache(newCache)
      }

      setLoading(false);

      //scroll to bottom
      messageListRef.current?.scrollTo(0, messageListRef.current.scrollHeight);
    } catch (error) {
      setLoading(false);
      setError('An error occurred while fetching the data. Please try again.');
      console.log('error', error);
    }
  })

  //prevent empty submissions
  const handleEnter = useMemoizedFn(e=>{
    if (e.key === 'Enter' && query) {
      handleSubmit(e);
    } else if (e.key == 'Enter') {
      e.preventDefault();
    }
  })

  const onTabClick = useMemoizedFn((index)=>{
    const name = resources.list[index]
    initCacheByName(name)
    setActive(index)
  })

  const { messages, history } = cache[curResourceName] || {messages:[],history:[]};
  return (
    <>
      <Layout>
        <div className="mx-auto flex flex-col gap-4">
          <h1 className="text-2xl font-bold leading-[1.1] tracking-tighter text-center">
            Chat With Your Docs
          </h1>
          <div
              className="text-sm font-medium text-center text-gray-500 border-b border-gray-200 dark:text-gray-400 dark:border-gray-700">
            <ul className="flex flex-wrap -mb-px">
              <DataFor list={resources.list}>
                {
                  (item,index)=>{
                    return (
                        <li className="mr-2" onClick={()=>{
                          onTabClick(index)
                        }}>
                          <a
                             className={["inline-block", "p-4", "border-b-2", "rounded-t-lg", "hover:text-gray-600", "dark:hover:text-gray-300", activeIndex  === index ? 'border-blue-600' :''].join(' ')}>
                            {item}
                          </a>
                        </li>
                    )
                  }
                }
              </DataFor>
            </ul>
          </div>
          <main className={styles.main}>
            <div className={styles.cloud}>
              <div ref={messageListRef} className={styles.messagelist}>
                <DataFor list={messages}>
                  {
                    (message,index)=>{
                      const className = message.type === 'apiMessage'
                          ? styles.apimessage
                          : (loading && index === messages.length - 1)
                              ? styles.usermessagewaiting
                              : styles.usermessage;
                      return (
                          <>
                            <div key={`chatMessage-${index}`} className={className}>
                              <Whether value={message.type === 'apiMessage'}>
                                <If>
                                  <Image
                                      key={index}
                                      src="/bot-image.png"
                                      alt="AI"
                                      width="40"
                                      height="40"
                                      className={styles.boticon}
                                      priority
                                  />
                                </If>
                                <Else>
                                  <Image
                                      key={index}
                                      src="/usericon.png"
                                      alt="Me"
                                      width="30"
                                      height="30"
                                      className={styles.usericon}
                                      priority
                                  />
                                </Else>
                              </Whether>
                              <div className={styles.markdownanswer}>
                                <ReactMarkdown linkTarget="_blank">
                                  {message.message}
                                </ReactMarkdown>
                              </div>
                            </div>
                            <Whether value={message.sourceDocs}>
                              <div
                                  className="p-5"
                                  key={`sourceDocsAccordion-${index}`}
                              >
                                <Accordion
                                    type="single"
                                    collapsible
                                    className="flex-col"
                                >
                                  <DataFor list={message.sourceDocs}>
                                    {
                                      (doc,index)=>{
                                        return (
                                            <div key={`messageSourceDocs-${index}`}>
                                              <AccordionItem value={`item-${index}`}>
                                                <AccordionTrigger>
                                                  <h3>Source {index + 1}</h3>
                                                </AccordionTrigger>
                                                <AccordionContent>
                                                  <ReactMarkdown linkTarget="_blank">
                                                    {doc.pageContent}
                                                  </ReactMarkdown>
                                                  <p className="mt-2">
                                                    <b>Source:</b> {doc.metadata.source}
                                                  </p>
                                                </AccordionContent>
                                              </AccordionItem>
                                            </div>
                                        )
                                      }
                                    }
                                  </DataFor>
                                </Accordion>
                              </div>
                            </Whether>
                          </>
                      )
                    }
                  }
                </DataFor>
              </div>
            </div>
            <div className={styles.center}>
              <div className={styles.cloudform}>
                <form onSubmit={handleSubmit}>
                  <textarea
                    disabled={loading}
                    onKeyDown={handleEnter}
                    ref={textAreaRef}
                    autoFocus={false}
                    rows={1}
                    maxLength={512}
                    id="userInput"
                    name="userInput"
                    placeholder={
                      loading
                        ? 'Waiting for response...'
                        : 'What is this legal case about?'
                    }
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className={styles.textarea}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className={styles.generatebutton}
                  >
                    <Whether value={loading}>
                      <If>
                        <div className={styles.loadingwheel}>
                          <LoadingDots color="#000" />
                        </div>
                      </If>
                      <Else>
                        <svg
                            viewBox="0 0 20 20"
                            className={styles.svgicon}
                            xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
                        </svg>
                      </Else>
                    </Whether>
                  </button>
                </form>
              </div>
            </div>
            <Whether value={!!error}>
              <div className="border border-red-400 rounded-md p-4">
                <p className="text-red-500">{error}</p>
              </div>
            </Whether>
          </main>
        </div>
        <footer className="m-auto p-4">
          <a href="https://twitter.com/mayowaoshin">
            Powered by LangChainAI. Demo built by Mayo (Twitter: @mayowaoshin).
          </a>
        </footer>
      </Layout>
    </>
  );
}

interface Props{
  resources:{
    list: string[],
    activeIndex:number
  }
}

export async function getServerSideProps() {
  const data = findSubfoldersWithFiles()
  return {
    props:{
      resources:{
        list: data,
        activeIndex:0
      }
    }
  };
}
