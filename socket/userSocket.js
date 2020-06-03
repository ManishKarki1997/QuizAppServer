
let users = []; // holds all online users in a class
let allActiveUsers = {}; // holds all the online users

const questions = {
    topic: 'Science',
    data: [
        {
            question: {
                question: 'Which is the closest star to the Earth?',
                options: ['Sun', 'Proxima Centauri', 'Betelgeuse', 'North Star'],
                answer: 'Sun'
            }
        },
        {
            question: {
                question: 'Which of the following is used in pencils?',
                options: ['Graphite', 'Silicon', 'Charcoal', 'Phosphorous'],
                answer: 'Graphite'
            }
        },
        {
            question: {
                question: 'The gas usually filled in the electric bulb is : ',
                options: ['Hydrogen', 'Carbon Dioxide', 'Oxygen', 'Nitrogen'],
                answer: 'Nitrogen'
            }
        },
        {
            question: {
                question: 'Washing soda is the common name for : ',
                options: [
                    'Calcium BiCarbonate',
                    'Sodium Carbonate',
                    'Calcium Carbonate',
                    'Sodium BiCarbonate'
                ],
                answer: 'Sodium BiCarbonate'
            }
        },
        {
            question: {
                question: 'Which of the gas is not a Green House gas?',
                options: [
                    'Methane',
                    'Nitrous Oxide',
                    'Carbon Dioxide',
                    'Hydrogen'
                ],
                answer: 'Hydrogen'
            }
        },
        {
            question: {
                question:
                    'The inert gas which is substituted for nitrogen in the air used by deep sea divers for breathing is: ',
                options: ['Argon', 'Xenon', 'Helium', 'Krypton'],
                answer: 'Helium'
            }
        },
        {
            question: {
                question: 'The average salinity of sea water is : ',
                options: ['3%', '3.5%', '2.5%', '2%'],
                answer: '3.5%'
            }
        }
    ]
}

const userSockets = (io) => {

    io.on('connection', (socket) => {

        const emitAllUsers = () => {
            io.emit("EMIT_ONLINE_USERS", allActiveUsers);
        }

        // when new client connects, emit all active users
        emitAllUsers();
        socket.emit("MY_SOCKET_ID", socket.id);

        socket.on("SUBMIT_USERNAME", (data) => {
            allActiveUsers[socket.id] = {
                ...data,
                socketId: socket.id
            }
            emitAllUsers();
        })

        socket.on("START_GAME", (data) => {
            const { roomName, participant1, participant2 } = data;
            io.sockets.connected[participant1.socketId].join(roomName);
            io.sockets.connected[participant2.socketId].join(roomName);
            io.to(roomName).emit("GAME_QUESTIONS", questions);

            // participant1.socketId.join(roomName);
            // participant2.socketId.join(roomName);
            // io.emit("GAME_QUESTIONS", questions);
        })

        socket.on('disconnect', () => {
            delete allActiveUsers[socket.id];
            emitAllUsers();
        })

    })
}

module.exports = { userSockets };