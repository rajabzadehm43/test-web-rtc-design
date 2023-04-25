import {useEffect, useRef, useState} from 'react'
import './App.css'
import io from 'socket.io-client'

const {RTCPeerConnection, RTCSessionDescription} = window

// const servers = {
//     iceServers: [
//         {
//             urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:1930']
//         }
//     ]
// }

// const servers = {
//     iceServers: [
//         {
//             urls: ['stun:192.168.1.9:30125']
//         }
//     ]
// }

const servers = {}

function App() {

    const peerConnection = useRef()
    const socket = useRef()
    const targetVideo = useRef()
    const isUnderCall = useRef(false)

    const [users, setUsers] = useState([])

    useEffect(() => {
        peerConnection.current = new RTCPeerConnection(servers)
        peerConnection.current.ontrack = peerConnectionTrackHandler
        window.currentConnection = peerConnection.current

        socket.current = io("http://192.168.1.9:3000")
        socket.current.on('all-connected-users', async users => {
            console.log('all connected users is ', users)
            setUsers(users)
        })

        socket.current.on('user-connected', userId => {
            const newUsers = [...users, userId]
            setUsers(newUsers)
        })

        socket.current.on('user-disconnected', userId => {
            const newUsers = users.filter(u => u.id !== userId)
            setUsers(newUsers)
        })

        socket.current.on('call-request', async ({caller, offer}) => {
            console.log(`user ${caller} request to call`)

            // const confirmation = confirm(`آیا تماس از طرف ${caller} را قبول میکنید ؟`)
            //
            // if (!confirmation) {
            //     // ToDo : Send Message To Caller For Reject Call ;
            //     return
            // }

            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer))

            const answer = await peerConnection.current.createAnswer()
            await peerConnection.current.setLocalDescription(new RTCSessionDescription(answer))

            socket.current.emit('acknowledge-call', {
                answer,
                caller
            })
        })

        socket.current.on('acknowledge-call', async ({from, answer}) => {
            console.log(`answer is `, answer)
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer))

           /* if (!isUnderCall.current) {
                const offer = await peerConnection.current.createOffer()
                await peerConnection.current.setLocalDescription(new RTCSessionDescription(offer))

                socket.current.emit('call-request', {
                    target: from,
                    offer
                })
                isUnderCall.current = true
            }*/

        })

        return () => {
            socket.current.disconnect()
        }
    }, [])

    async function peerConnectionTrackHandler (data) {
        console.log('handling new track with data: ', data)
        const {streams: [stream]} = data
        console.log('stream is: ', stream)
        targetVideo.current.srcObject = stream
    }

    const handleUserClick = async target => {


        const offer = await peerConnection.current.createOffer()
        await peerConnection.current.setLocalDescription(new RTCSessionDescription(offer))

        socket.current.emit('call-request', {
            target,
            offer
        })
    }

    const sendAudioAndVideo = async event => {
        navigator.getUserMedia({
            audio: true,
            video: true
        }, stream => {
            stream.getTracks().forEach(track => {
                peerConnection.current.addTrack(track, stream)
            })
            // targetVideo.current.srcObject = stream
            // targetVideo.current.setAttribute('muted', '')
        }, error => {
            console.log('error excepted: ', error)
        })
    }

    return (
        <div className="App">
            <div style={{display: 'inline-block', width: '30%'}}>
                <h3>All Users</h3>
                <ul>
                    {users.map(u => (
                        <li key={u} onClick={e => handleUserClick(u)}>{u}</li>
                    ))}
                </ul>
            </div>
            <div style={{
                display: 'inline-block',
                width: '70%',
                background: 'gray'
            }}>
                <video ref={targetVideo} style={{
                    width: '100%',
                    aspectRatio: '1/1'
                }}
                       autoPlay={true}
                ></video>
                <button onClick={sendAudioAndVideo}>Send Audio And Video</button>
            </div>
        </div>
    )
}

export default App
