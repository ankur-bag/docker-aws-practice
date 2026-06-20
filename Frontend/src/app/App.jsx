import React from 'react'
import "./App.css"
import {Editor} from "@monaco-editor/react"
import {MonacoBinding} from "y-monaco"
import {useRef, useMemo} from "react"
import * as Y from "yjs"
import {SocketIOProvider} from "y-socket.io"

const App = () => {

  const editorRef = useRef (null)
   /* in ydoc all the files in the frontend is stored */ 
  const ydoc = useMemo(() => new Y.Doc(), [])
  /* and though ydoc , yjs compares the snapshots of the text in ydoc  and the present updated ydoc and takes out the delta and then that delta goes to the server , and then server broadcasts the same delta to all the connected clients */ 
  const yText = useMemo(() => ydoc.getText("monaco"), [ydoc])

  const handleMount = (editor) =>{
      editorRef.current = editor 
      /*SocketIOProvider sets the connections between the user and the server*/ 
      const provider = new SocketIOProvider("http://localhost:3000", "monaco", ydoc, { autoConnect: true })
      /*MonacoBinding sets the monaco editor to sync with the ydoc*/ 
      const monacoBinding = new MonacoBinding (

        yText,
        editorRef.current.getModel(),
        new Set ([editorRef.current]),
        provider.awareness
      )
  }

  return (
    <>
    <main className="h-screen w-full bg-gray-950 flex gap-4 p-4">

      <aside className='h-full w-1/4 bg-amber-50 rounded-lg'>

      </aside>
      <section className='w-3/4 bg-neutral-800  rounded-lg overflow-hidden'>
          
          <Editor 
          height="100%"
          defaultLanguage='javascript'
          defaultValue='// some comment'
          theme='vs-dark'
          onMount={handleMount}
          />

          
      </section>
    </main>
    </>
  )
}

export default App