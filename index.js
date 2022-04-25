/* 
    In short, this solution aims to break up all timeperiods that are bookable, eg startTime -> endTime
    or if there exists any breaks, startTime -> startBreak, endBreak -> startBreak1, endBreak1 -> endTime

    Number of possible 15 min sessions will then be calculated from the timeperiods and added to a new
    array of objects with bookable time slots
*/

const APIResponse = `[
    {
        "scheduleId": 4711,
        "startDate": "2020-04-29",
        "startTime": "10:00:00",
        "endDate": "2020-04-29",
        "endTime": "14:30:00",
        "startBreak": "12:00:00",
        "endBreak": "12:30:00",
        "startBreak2": "00:00:00",
        "endBreak2": "00:00:00",
        "startBreak3": "00:00:00",
        "endBreak3": "00:00:00",
        "startBreak4": "00:00:00",
        "endBreak4": "00:00:00",
        "employeeId": 4712,
        "employeeName": "John Doe"
    },
    {
        "scheduleId": 4713,
        "startDate": "2020-04-29",
        "startTime": "10:00:00",
        "endDate": "2020-04-29",
        "endTime": "16:35:00",
        "startBreak": "10:30:00",
        "endBreak": "12:30:00",
        "startBreak2": "16:00:00",
        "endBreak2": "16:15:00",
        "startBreak3": "00:00:00",
        "endBreak3": "00:00:00",
        "startBreak4": "00:00:00",
        "endBreak4": "00:00:00",
        "employeeId": 4714,
        "employeeName": "Jane Doe"
    },
    {
        "scheduleId": 4715,
        "startDate": "2020-04-29",
        "startTime": "18:00:00",
        "endDate": "2020-04-29",
        "endTime": "22:10:00",
        "startBreak": "19:00:00",
        "endBreak": "19:30:00",
        "startBreak2": "00:00:00",
        "endBreak2": "00:00:00",
        "startBreak3": "00:00:00",
        "endBreak3": "00:00:00",
        "startBreak4": "00:00:00",
        "endBreak4": "00:00:00",
        "employeeId": 4714,
        "employeeName": "Jane Doe"
    }
]`

const parsedResponse = JSON.parse(APIResponse)

// Helper function to parse breaks from initial JSON into new array containing start and end times of breaks in the following format:
/*
[
    {
        start: "2020-04-29 19:00:00",
        end: "2020-04-29 19:30:00"
    },
]
*/
const breakHelper = (schedule) => {
    let breaks = []
    for (let i = 0; i < 4; i++) {
        // Special handling of first break since it doesnt contain a number in the object key
        if (i === 0) {
            // Only add break if the time is not 00:00:00
            if (schedule.startBreak !== "00:00:00") {
                breaks = [...breaks, 
                    {
                        start: new Date(`${schedule.startDate} ${schedule.startBreak}`).toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' }),
                        end: new Date(`${schedule.startDate} ${schedule.endBreak}`).toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' })
                    }
                ]
            }
        } else if (schedule[`startBreak${i + 1}`] !== "00:00:00") {
            breaks = [...breaks, 
                {
                    start: new Date(`${schedule.startDate} ${schedule[`startBreak${i + 1}`]}`).toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' }),
                    end: new Date(`${schedule.startDate} ${schedule[`endBreak${i + 1}`]}`).toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' })
                }
            ]
        }
    }
    return breaks
}

// Helper functions to add bookable timeslots objects to an array and return said array.
// Takes in number of timeslots, time to start the count on, and employee name 
const addBookableTimeSlotHelper = (bookableTimeSlots, bookableStartTime, employeeName) => {
    let bookableTimeSlotsPerSession = []

    helperHoursAndMinutes(new Date(bookableStartTime).toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' }))
    for (let i = 0; i < bookableTimeSlots; i++) {
        const sessionStartTime = new Date(bookableStartTime).getTime() + (i * 900000)
        const sessionEndTime = new Date(bookableStartTime).getTime() + 900000 + (i * 900000)
        
        bookableTimeSlotsPerSession = [...bookableTimeSlotsPerSession, {
            date: new Date(sessionStartTime).toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' }),
            startTime: helperHoursAndMinutes(sessionStartTime),
            endTime: helperHoursAndMinutes(sessionEndTime),
            employee: employeeName,
        }]
    }
    return bookableTimeSlotsPerSession
}

// Helper function to regex HH:mm from toLocaleString value and return HH:mm
const helperHoursAndMinutes = (dateTime) => {
    const localeDateString = new Date(dateTime).toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' })
    const regexToMatch = /[0-9][0-9]:[0-9][0-9]/
    const matchedHoursAndMinutes = localeDateString.match(regexToMatch)
    return matchedHoursAndMinutes[0]
}

// Helper to calculate the number of bookable timeslots in 15 minutes interval for a given timeperiod
const numberOfTimeSlots = (startTime, endTime) => {
    return Math.floor(Math.round((endTime.getTime() - startTime.getTime()) / 60000) / 15)
}

// Main reducer to parse the response data into the correct format
const format = parsedResponse.reduce((acc, curr) => {
    const breaks = breakHelper(curr)
    
    const startTime = new Date(`${curr.startDate} ${curr.startTime}`)
    const endTime = new Date(`${curr.startDate} ${curr.endTime}`)
    const instructor = curr.employeeName

    // Scenario 1: No breaks. Calculate all time slots between start and end time
    if (breaks.length < 1) {
        const bookableTimeSlots = numberOfTimeSlots(startTime, endTime)
        acc = [...acc, ...addBookableTimeSlotHelper(bookableTimeSlots, startTime, instructor)]
        return [...acc]
    } else {
        // Scenario 2: There are breaks. Calculate time slots while handling breaks
        // Reducer to add all bookable timeslots in a new of array of objects
        const sessions = breaks.reduce((acc, curr, index, array) => {
            const breakStartTime = new Date(curr.start)
            const breakEndTime = new Date(curr.end)

            // A: The first iteration will have startTime as start value, get all time slots between startTime and startBreak
            if (index === 0) {
                const bookableTimeSlots1 = numberOfTimeSlots(startTime, breakStartTime)
                acc = [...acc, ...addBookableTimeSlotHelper(bookableTimeSlots1, startTime, instructor)]
                // B: If there is only 1 break, get all time slots between endBreak and endTime
                if (array.length === 1) {
                    const bookableTimeSlots2 = numberOfTimeSlots(breakEndTime, endTime)
                    acc = [...acc, ...addBookableTimeSlotHelper(bookableTimeSlots2, breakEndTime, instructor)]
                }
            } // C: If it's the last iteration of breaks, get all time slots between the last endBreak and endTime 
            else if (index === array.length - 1) {
                const bookableTimeSlots1 = numberOfTimeSlots(new Date(array[index - 1].end), new Date(curr.start))
                acc = [...acc, ...addBookableTimeSlotHelper(bookableTimeSlots1, new Date(array[index - 1].end), instructor)]

                const bookableTimeSlots2 = numberOfTimeSlots(new Date(breakEndTime), endTime)
                acc = [...acc, ...addBookableTimeSlotHelper(bookableTimeSlots2, breakEndTime, instructor)]
            } // D: Handle all other iterations between the first and last iterations, get all time slots between the previous endBreak and the next startBreak 
            else {
                const bookableTimeSlots = numberOfTimeSlots(new Date(array[index - 1].end), new Date(curr.start))
                acc = [...acc, ...addBookableTimeSlotHelper(bookableTimeSlots, new Date(array[index - 1].end), instructor)]
            }
            return [...acc]
        }, [])
        return [...acc, ...sessions]
    }
}, [])

console.log("format", format.sort((a, b) => new Date(a.date) - new Date(b.date)))