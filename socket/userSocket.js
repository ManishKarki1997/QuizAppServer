
let users = []; // holds all online users in a class
let allActiveUsers = {}; // holds all the online users
const gameCountdown = 5

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
                question: 'The gas usually filled in the electric bulb is ',
                options: ['Hydrogen', 'Carbon Dioxide', 'Oxygen', 'Nitrogen'],
                answer: 'Nitrogen'
            }
        },
        {
            question: {
                question: 'Washing soda is the common name for',
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
                options: ['Methane', 'Nitrous Oxide', 'Carbon Dioxide', 'Hydrogen'],
                answer: 'Hydrogen'
            }
        },
        {
            question: {
                question:
                    'The inert gas which is substituted for nitrogen in the air used by deep sea divers for breathing is',
                options: ['Argon', 'Xenon', 'Helium', 'Krypton'],
                answer: 'Helium'
            }
        },
        {
            question: {
                question: 'The average salinity of sea water is',
                options: ['3%', '3.5%', '2.5%', '2%'],
                answer: '3.5%'
            }
        }
    ]
}

const userSockets = (io) => {

    io.on('connection', (socket) => {

        // helper function to emit all online users
        const emitAllUsers = () => {
            io.emit("EMIT_ONLINE_USERS", allActiveUsers);
        }

        // when new client connects, emit all active users
        emitAllUsers();

        // emit the user their current socket id
        socket.emit("MY_SOCKET_ID", socket.id);

        // when the user first loads the page,
        // add the user socket id to the active online users
        // with the socket id as key and the user details as values
        socket.on("SUBMIT_USER_DETAILS", (data) => {
            allActiveUsers[socket.id] = {
                ...data,
                socketId: socket.id
            }
            emitAllUsers();
        })

        socket.on("START_GAME", (data) => {
            const { roomName, challenger, opponent } = data;

            // join both user sockets to the room
            io.sockets.connected[challenger.socketId].join(roomName);
            io.sockets.connected[opponent.socketId].join(roomName);

            // send the two users details to each other
            // on the client side, they'll figure out who their opponent is
            io.to(roomName).emit("OPPONENT_DETAILS", [
                challenger,
                opponent
            ]);

            // emit the game starting countdown
            socket.emit('GAME_IN_SECONDS', gameCountdown)

            // after the countdown, emit the game questions
            setTimeout(() => {
                io.to(roomName).emit("GAME_QUESTIONS", questions);
            }, gameCountdown * 1000);

        })

        // when the socket disconnects, delete the socket id from allActiveUsers 
        // and emit the online users event to update on the client side
        socket.on('disconnect', () => {
            delete allActiveUsers[socket.id];
            emitAllUsers();
        })

    })
}

module.exports = { userSockets };