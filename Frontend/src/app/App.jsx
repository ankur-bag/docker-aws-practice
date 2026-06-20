import React from "react";
import "./App.css";
import { Editor } from "@monaco-editor/react";
import { MonacoBinding } from "y-monaco";
import { useRef, useMemo, useState, useEffect } from "react";
import * as Y from "yjs";
import { SocketIOProvider } from "y-socket.io";

const App = () => {
  const [username, setUsername] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("username") || "";
  });
  const [users, setUsers] = useState([]);
  const [inactiveUsers, setInactiveUsers] = useState([]);
  const [isJoined, setIsJoined] = useState(false);

  const editorRef = useRef(null);
  /* in ydoc all the files in the frontend is stored */
  const ydoc = useMemo(() => new Y.Doc(), []);
  /* and though ydoc , yjs compares the snapshots of the text in ydoc  and the present updated ydoc and takes out the delta and then that delta goes to the server , and then server broadcasts the same delta to all the connected clients */
  const yText = useMemo(() => ydoc.getText("monaco"), [ydoc]);
  /* it represents the document of the monaco editor and it is used to sync the monaco editor with the ydoc*/
  const [editorReady, setEditorReady] = useState(false);

  const handleMount = (editor) => {
    editorRef.current = editor;
    setEditorReady(true);
  };

  useEffect(() => {
    if (username && editorRef.current && editorReady) {
      const provider = new SocketIOProvider(
        "http://localhost:3000",
        "monaco",
        ydoc,
        { autoConnect: true },
      );
      provider.on("status", (event) => {
        console.log(event);
      });

      provider.awareness.setLocalStateField("user", { username });

      provider.awareness.on("change", () => {
        const states = Array.from(provider.awareness.getStates().entries());
        const currentActive = states
          .map(([clientId, state]) => ({ clientId, username: state?.user?.username }))
          .filter((user) => Boolean(user.username));

        setUsers((prevActive) => {
          const leftUsers = prevActive.filter(
            (oldUser) => !currentActive.some((newUser) => newUser.clientId === oldUser.clientId)
          );

          if (leftUsers.length > 0) {
            const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setInactiveUsers((prev) => {
              const filteredPrev = prev.filter(p => !leftUsers.some(l => l.username === p.username));
              return [...filteredPrev, ...leftUsers.map(u => ({ username: u.username, leftAt: now }))];
            });
          }

          setInactiveUsers((prev) =>
            prev.filter((inactive) => !currentActive.some((active) => active.username === inactive.username))
          );

          return currentActive;
        });
      });

      const handleBeforeUnload = () => {
        provider.awareness.setLocalStateField("user", null);
      };
      window.addEventListener("beforeunload", handleBeforeUnload);
      const monacoBinding = new MonacoBinding(
        yText,
        editorRef.current.getModel() /* it represents the model of the monaco editor and it is used to sync the monaco editor with the ydoc*/,
        new Set([editorRef.current]),
        provider.awareness /* for the purpose of the awareness of the cursor */,
      );

      return () => {
        monacoBinding.destroy();
        provider.disconnect();
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    }
  }, [username, editorReady]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (username.trim()) {
      window.history.pushState({}, "", "?username=" + username.trim());
      setIsJoined(true);
    }
  };

  if (!isJoined) {
    return (
      <main className="h-screen w-full bg-gray-950 flex gap-4 p-4 items-center justify-center">
        <form onSubmit={handleJoin} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Enter your username"
            className="p-2 rounded-lg bg-gray-800 text-white"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button
            type="submit"
            className="p-2 rounded-lg bg-amber-50  text-gray-950 font-bold"
          >
            Join
          </button>
        </form>
      </main>
    );
  }
  return (
    <>
      <main className="h-screen w-full bg-gray-950 flex gap-4 p-4">
        <aside className="h-full w-1/4 bg-amber-50 rounded-lg flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <h2 className="text-xl font-bold p-4 border-b border-gray-300">Active</h2>
            <ul className="p-4">
              {users.map((user, index) => (
                <li key={user.clientId || index} className="p-2 bg-green-100 text-green-900 rounded mb-2 border border-green-300 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  {user.username}
                </li>
              ))}
            </ul>

            {inactiveUsers.length > 0 && (
              <>
                <h2 className="text-xl font-bold p-4 border-y border-gray-300 text-gray-600">Inactive</h2>
                <ul className="p-4">
                  {inactiveUsers.map((user, index) => (
                    <li key={index} className="p-2 bg-gray-200 text-gray-600 rounded mb-2 border border-gray-300 flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                        {user.username}
                      </div>
                      <span className="text-xs text-gray-500">{user.leftAt}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          
          <div className="p-4 border-t border-gray-300 bg-amber-100">
            <label htmlFor="username" className="block text-sm font-bold text-gray-700 mb-1">Username</label>
            <input
              type="text"
              id="username"
              className="w-full p-2 rounded border border-gray-300"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
        </aside>
        <section className="w-3/4 bg-neutral-800  rounded-lg overflow-hidden">
          <Editor
            height="100%"
            defaultLanguage="javascript"
            defaultValue="// some comment"
            theme="vs-dark"
            onMount={handleMount}
          />
        </section>
      </main>
    </>
  );
};

export default App;
