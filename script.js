/* ==========================================================================
   LifeTrack — Productivity OS
   Improved Application Script

   Part 1:
   Core Architecture
   Utilities
   Storage Manager
   ========================================================================== */





"use strict";






/* ==========================================================================
   APP CONFIGURATION
   ========================================================================== */


const LifeTrackConfig = {


    appName:
        "LifeTrack",



    version:
        "2.0.0",



    storageKey:
        "lifetrack_database",



    themeKey:
        "lifetrack_theme",



    defaultTheme:
        "light",



    maxArchiveItems:
        50



};









/* ==========================================================================
   UTILITY FUNCTIONS
   ========================================================================== */


const Utils = {



    generateId(prefix = "id") {


        return `${prefix}_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2,9)}`;


    },






    clone(data) {


        return JSON.parse(
            JSON.stringify(data)
        );


    },







    debounce(fn, delay = 300) {


        let timer;


        return (...args) => {


            clearTimeout(timer);


            timer = setTimeout(
                () => fn(...args),
                delay
            );


        };


    },







    safeParse(value, fallback = null) {


        try {


            return JSON.parse(value);


        }

        catch(error) {


            console.warn(
                "Parse error:",
                error
            );


            return fallback;


        }


    },







    formatDate(date) {


        const d =
            new Date(date);



        return d.toISOString()
            .split("T")[0];


    },







    today() {


        return this.formatDate(
            new Date()
        );


    },







    daysBetween(start, end) {


        const first =
            new Date(start);



        const second =
            new Date(end);



        const diff =
            Math.abs(
                second - first
            );



        return Math.floor(
            diff /
            (1000 * 60 * 60 * 24)
        );


    },







    isSameDay(a,b) {


        return this.formatDate(a)
            === this.formatDate(b);


    },







    clamp(value,min,max) {


        return Math.min(
            Math.max(value,min),
            max
        );


    }



};









/* ==========================================================================
   DATE MANAGER
   ========================================================================== */


const DateManager = {



    getToday() {


        return new Date();


    },





    getMonthStart(date = new Date()) {


        return new Date(
            date.getFullYear(),
            date.getMonth(),
            1
        );


    },





    getMonthEnd(date = new Date()) {


        return new Date(
            date.getFullYear(),
            date.getMonth()+1,
            0
        );


    },






    getDaysInMonth(date = new Date()) {


        return this.getMonthEnd(date)
            .getDate();


    },







    getWeekDates(date = new Date()) {


        const current =
            new Date(date);



        const day =
            current.getDay();



        const start =
            new Date(current);



        start.setDate(
            current.getDate()-day
        );



        return Array.from(
            {
                length:7
            },

            (_,index)=> {


                const d =
                    new Date(start);



                d.setDate(
                    start.getDate()+index
                );


                return d;


            }

        );


    },






    formatReadable(date) {


        return new Intl.DateTimeFormat(
            "en",
            {
                day:"numeric",
                month:"short",
                year:"numeric"
            }

        ).format(
            new Date(date)
        );


    }



};









/* ==========================================================================
   STORAGE MANAGER
   ========================================================================== */


class StorageManager {


    constructor() {


        this.key =
            LifeTrackConfig.storageKey;


    }






    getDatabase() {


        const saved =
            localStorage.getItem(
                this.key
            );



        if(!saved) {


            return this.createDefaultDatabase();


        }



        return Utils.safeParse(
            saved,
            this.createDefaultDatabase()
        );


    }







    saveDatabase(data) {


        try {


            localStorage.setItem(
                this.key,
                JSON.stringify(data)
            );



            return true;


        }


        catch(error) {


            console.error(
                "Storage failed:",
                error
            );


            return false;


        }


    }







    createDefaultDatabase() {


        return {


            habits:[],


            todos:[],


            notes:[],


            countdowns:[],


            archives:[],



            settings:{


                theme:"light",


                accent:"#4f46e5",


                fontSize:"medium",


                firstDay:"monday"


            },



            metadata:{


                version:
                    LifeTrackConfig.version,


                created:
                    new Date().toISOString()


            }


        };


    }






    clear() {


        localStorage.removeItem(
            this.key
        );


    }


}






// Global storage instance


const storage =
    new StorageManager();
/* ==========================================================================
   Part 2:
   State Management
   Habit Engine
   Statistics System
   ========================================================================== */







/* ==========================================================================
   APPLICATION STATE MANAGER
   ========================================================================== */


class StateManager {


    constructor() {


        this.database =
            storage.getDatabase();



        this.listeners = [];



    }







    get state() {


        return this.database;


    }







    update(callback) {


        callback(this.database);



        storage.saveDatabase(
            this.database
        );



        this.notify();



    }







    subscribe(listener) {


        this.listeners.push(
            listener
        );


    }







    notify() {


        this.listeners.forEach(
            listener => {


                try {


                    listener(
                        this.database
                    );


                }


                catch(error) {


                    console.error(
                        error
                    );


                }


            }

        );


    }







    reset() {


        this.database =
            storage.createDefaultDatabase();



        storage.saveDatabase(
            this.database
        );



        this.notify();


    }



}







const appState =
    new StateManager();









/* ==========================================================================
   HABIT ENGINE
   ========================================================================== */


class HabitEngine {



    constructor(stateManager) {


        this.state =
            stateManager;


    }







    getHabits() {


        return this.state.state.habits;


    }







    addHabit(data) {


        const habit = {


            id:
                Utils.generateId("habit"),



            name:
                data.name.trim(),



            category:
                data.category || "General",



            color:
                data.color || "#4f46e5",



            createdAt:
                new Date().toISOString(),



            completions:{}



        };



        this.state.update(
            db => {


                db.habits.push(
                    habit
                );


            }

        );



        return habit;


    }







    deleteHabit(id) {


        this.state.update(
            db => {


                db.habits =
                    db.habits.filter(
                        h => h.id !== id
                    );


            }

        );


    }







    toggleCompletion(
        habitId,
        date = Utils.today()
    ) {


        this.state.update(
            db => {


                const habit =
                    db.habits.find(
                        h =>
                        h.id === habitId
                    );



                if(!habit)
                    return;



                if(
                    habit.completions[date]
                ) {


                    delete habit.completions[date];


                }

                else {


                    habit.completions[date]
                        = true;


                }


            }

        );


    }







    isCompleted(
        habit,
        date
    ) {


        return Boolean(
            habit.completions[date]
        );


    }







    getCompletionCount(
        habit
    ) {


        return Object.keys(
            habit.completions
        ).length;


    }







    getHabitPercentage(
        habit,
        days = 30
    ) {


        const total =
            days;



        const completed =
            this.getRecentCompletions(
                habit,
                days
            );



        return Math.round(
            (
                completed /
                total
            )
            *100
        );



    }







    getRecentCompletions(
        habit,
        days = 30
    ) {


        let count = 0;



        for(
            let i=0;
            i<days;
            i++
        ) {


            const date =
                new Date();



            date.setDate(
                date.getDate()-i
            );



            const key =
                Utils.formatDate(
                    date
                );



            if(
                habit.completions[key]
            )
                count++;



        }



        return count;


    }







    calculateStreak(
        habit
    ) {


        let streak = 0;



        let current =
            new Date();



        while(true) {


            const date =
                Utils.formatDate(
                    current
                );



            if(
                habit.completions[date]
            ) {


                streak++;



                current.setDate(
                    current.getDate()-1
                );


            }

            else {


                break;


            }


        }



        return streak;


    }







    calculateLongestStreak(
        habit
    ) {


        const dates =
            Object.keys(
                habit.completions
            )
            .sort();



        let longest = 0;

        let current = 0;

        let previous = null;



        dates.forEach(
            date => {


                if(previous) {


                    const diff =
                        Utils.daysBetween(
                            previous,
                            date
                        );



                    if(diff === 1) {

                        current++;

                    }

                    else {

                        current=1;

                    }


                }

                else {


                    current=1;


                }



                longest =
                    Math.max(
                        longest,
                        current
                    );



                previous=date;



            }

        );



        return longest;


    }


}







const habitEngine =
    new HabitEngine(
        appState
    );









/* ==========================================================================
   STATISTICS ENGINE
   ========================================================================== */


class StatisticsEngine {



    constructor(
        habitEngine
    ) {


        this.habits =
            habitEngine;


    }







    totalHabits() {


        return this.habits
            .getHabits()
            .length;


    }







    totalCheckIns() {


        return this.habits
            .getHabits()
            .reduce(
                (sum,habit)=>
                    sum+
                    Object.keys(
                        habit.completions
                    ).length,

                0

            );


    }







    completionRate(
        days = 30
    ) {


        const habits =
            this.habits.getHabits();



        if(!habits.length)
            return 0;



        const possible =
            habits.length *
            days;



        return Math.round(

            (
                this.totalCheckIns()
                /
                possible

            )*100

        );


    }







    bestHabit() {


        const habits =
            this.habits.getHabits();



        return habits
            .sort(
                (a,b)=>
                this.habits
                .getCompletionCount(b)
                -
                this.habits
                .getCompletionCount(a)

            )[0]
            || null;


    }



}






const statistics =
    new StatisticsEngine(
        habitEngine
    );
/* ==========================================================================
   Part 3:
   Chart Manager
   Countdown Engine
   Archive System
   Backup Manager
   ========================================================================== */







/* ==========================================================================
   CHART MANAGER
   ========================================================================== */


class ChartManager {


    constructor() {


        this.charts = {};

    }







    create(
        id,
        config
    ) {


        const canvas =
            document.getElementById(
                id
            );



        if(!canvas)
            return null;



        this.destroy(id);



        this.charts[id] =
            new Chart(
                canvas,
                config
            );



        return this.charts[id];


    }







    destroy(id) {


        if(
            this.charts[id]
        ) {


            this.charts[id].destroy();



            delete this.charts[id];


        }


    }







    destroyAll() {


        Object.keys(
            this.charts
        )
        .forEach(
            id =>
            this.destroy(id)
        );


    }



}






const chartManager =
    new ChartManager();









/* ==========================================================================
   COUNTDOWN ENGINE
   ========================================================================== */


class CountdownEngine {


    constructor(state) {


        this.state =
            state;


    }







    getAll() {


        return this.state
            .state
            .countdowns;


    }







    add(data) {


        const countdown = {


            id:
                Utils.generateId(
                    "goal"
                ),



            title:
                data.title.trim(),



            description:
                data.description || "",



            category:
                data.category || "General",



            date:
                data.date,



            time:
                data.time || "00:00",



            priority:
                data.priority || "medium",



            color:
                data.color || "#4f46e5",



            createdAt:
                new Date()
                .toISOString()


        };



        this.state.update(
            db => {


                db.countdowns.push(
                    countdown
                );


            }

        );



        return countdown;


    }







    remove(id) {


        this.state.update(
            db => {


                db.countdowns =
                    db.countdowns.filter(
                        item =>
                        item.id !== id
                    );


            }

        );


    }







    getRemaining(goal) {


        const target =
            new Date(
                `${goal.date}
                T${goal.time}`
            );



        const now =
            new Date();



        const diff =
            target-now;



        if(diff<=0) {


            return {


                expired:true,


                days:0,


                hours:0,


                minutes:0,


                seconds:0


            };


        }







        return {


            expired:false,


            days:
                Math.floor(
                    diff /
                    (1000*60*60*24)
                ),



            hours:
                Math.floor(
                    diff /
                    (1000*60*60)
                )
                %24,



            minutes:
                Math.floor(
                    diff /
                    (1000*60)
                )
                %60,



            seconds:
                Math.floor(
                    diff/1000
                )
                %60


        };


    }



}







const countdownEngine =
    new CountdownEngine(
        appState
    );









/* ==========================================================================
   ARCHIVE MANAGER
   ========================================================================== */


class ArchiveManager {



    constructor(state) {


        this.state =
            state;


    }







    createSnapshot() {


        const snapshot = {


            id:
                Utils.generateId(
                    "archive"
                ),



            createdAt:
                new Date()
                .toISOString(),



            data:
                Utils.clone(
                    this.state.state
                )


        };



        this.state.update(
            db => {


                db.archives.unshift(
                    snapshot
                );



                db.archives =
                    db.archives.slice(
                        0,
                        LifeTrackConfig
                        .maxArchiveItems
                    );


            }

        );



        return snapshot;


    }







    getSnapshots() {


        return this.state
            .state
            .archives;


    }







    restore(id) {


        const snapshot =
            this.getSnapshots()
            .find(
                item =>
                item.id===id
            );



        if(!snapshot)
            return false;



        this.state.update(
            db => {


                Object.assign(
                    db,
                    Utils.clone(
                        snapshot.data
                    )
                );


            }

        );



        return true;


    }



}







const archiveManager =
    new ArchiveManager(
        appState
    );









/* ==========================================================================
   BACKUP MANAGER
   ========================================================================== */


class BackupManager {



    export() {


        const data =
            JSON.stringify(
                appState.state,
                null,
                2
            );



        const blob =
            new Blob(
                [data],
                {
                    type:
                    "application/json"
                }
            );



        const url =
            URL.createObjectURL(
                blob
            );



        const link =
            document.createElement(
                "a"
            );



        link.href=url;



        link.download =
            "lifetrack-backup.json";



        link.click();



        URL.revokeObjectURL(
            url
        );


    }







    import(file) {


        const reader =
            new FileReader();



        reader.onload =
        event => {


            const data =
                Utils.safeParse(
                    event.target.result
                );



            if(!data)
                return;



            storage.saveDatabase(
                data
            );



            location.reload();


        };



        reader.readAsText(
            file
        );


    }



}







const backupManager =
    new BackupManager();
/* ==========================================================================
   Part 4:
   LifeTrack Application Controller
   Navigation System
   Theme Engine
   ========================================================================== */




/* ==========================================================================
   MAIN APPLICATION CONTROLLER
   ========================================================================== */


class LifeTrackApp {



    constructor() {


        this.currentTab =
            "dashboard";




        this.calendarViewMode = "month";
        this.calendarCurrentDate = new Date();
        this.selectedCalendarDate = Utils.today();



        this.init();


    }










    init() {


        this.cacheElements();


        this.bindEvents();


        this.loadSettings();


        this.renderAll();



    }







    cacheElements() {


        this.elements = {


            sidebar:
                document.getElementById(
                    "sidebar"
                ),



            sidebarBackdrop:
                document.getElementById(
                    "sidebarBackdrop"
                ),



            mobileMenuBtn:
                document.getElementById(
                    "mobileMenuBtn"
                ),



            sidebarClose:
                document.getElementById(
                    "sidebarCloseMobile"
                ),



            themeToggle:
                document.getElementById(
                    "themeToggle"
                ),



            themeLabel:
                document.getElementById(
                    "themeToggleLabel"
                ),



            pageTitle:
                document.getElementById(
                    "pageTitle"
                )


        };


    }









    bindEvents() {



        /* Navigation */


        document
        .querySelectorAll(
            ".nav-item"
        )
        .forEach(
            button => {


                button.addEventListener(
                    "click",
                    () => {


                        this.openTab(
                            button.dataset.tab
                        );


                    }
                );


            }
        );







        /* Quick navigation */


        document
        .querySelectorAll(
            "[data-quick-nav]"
        )
        .forEach(
            button => {


                button.addEventListener(
                    "click",
                    () => {


                        this.openTab(
                            button.dataset
                            .quickNav
                        );


                    }
                );


            }
        );








        /* Mobile menu */


        this.elements
        .mobileMenuBtn
        ?.addEventListener(
            "click",
            () =>
            this.toggleSidebar()
        );



        this.elements
        .sidebarClose
        ?.addEventListener(
            "click",
            () =>
            this.closeSidebar()
        );



        this.elements
        .sidebarBackdrop
        ?.addEventListener(
            "click",
            () =>
            this.closeSidebar()
        );









        /* Theme */


        this.elements
        .themeToggle
        ?.addEventListener(
            "click",
            () =>
            this.toggleTheme()
        );



    }









    openTab(tab) {



        this.currentTab =
            tab;





        document
        .querySelectorAll(
            ".view-section"
        )
        .forEach(
            section => {


                section.classList
                .toggle(
                    "active",
                    section.id===tab
                );


            }
        );







        document
        .querySelectorAll(
            ".nav-item"
        )
        .forEach(
            item => {


                item.classList
                .toggle(
                    "active",
                    item.dataset.tab===tab
                );


            }
        );







        const title =
            tab
            .charAt(0)
            .toUpperCase()
            +
            tab.slice(1);



        if(this.elements.pageTitle) {


            this.elements
            .pageTitle
            .textContent =
                title;


        }



        this.closeSidebar();



        this.renderSection(tab);


    }


    renderSection(tab) {


        switch(tab) {


            case "dashboard":

                this.renderDashboard();

            break;



            case "habits":

                this.renderHabits();

            break;



            case "calendar":

                this.renderCalendar();

            break;



            case "countdowns":

                this.renderCountdowns();

            break;



            case "analytics":

                this.renderAnalytics();

            break;



            case "notes":

                this.renderNotes();

            break;



            case "todos":

                this.renderTodos();

            break;



            case "archive":

                this.renderArchive();

            break;



            case "settings":

                // Settings views are static/managed via settings controls

            break;


        }


    }





    renderAll() {


        this.renderDashboard();


        this.renderHabits();


        this.renderCountdowns();


        this.renderAnalytics();


    }
















    









    toggleSidebar() {


        this.elements
        .sidebar
        ?.classList
        .toggle(
            "open"
        );


        this.elements
        .sidebarBackdrop
        ?.classList
        .toggle(
            "show"
        );


    }







    closeSidebar() {


        this.elements
        .sidebar
        ?.classList
        .remove(
            "open"
        );



        this.elements
        .sidebarBackdrop
        ?.classList
        .remove(
            "show"
        );


    }









/* ==========================================================================
   THEME SYSTEM
   ========================================================================== */





    loadSettings() {


        const settings =
            appState.state.settings;



        document.body
        .classList
        .toggle(
            "dark",
            settings.theme==="dark"
        );


        this.updateThemeLabel();


    }









    toggleTheme() {


        const dark =
            document.body
            .classList
            .toggle(
                "dark"
            );



        appState.update(
            db => {


                db.settings.theme =
                    dark
                    ? "dark"
                    : "light";


            }
        );



        this.updateThemeLabel();


    }









    updateThemeLabel() {


        if(!this.elements.themeLabel)
            return;



        const dark =
            document.body
            .classList
            .contains(
                "dark"
            );



        this.elements
        .themeLabel
        .textContent =
            dark
            ? "Light Mode"
            : "Dark Mode";


    }

}






/* Global application instance */


let lifeTrackApp;







document.addEventListener(
    "DOMContentLoaded",
    () => {


        lifeTrackApp =
            new LifeTrackApp();


    }
);
/* ==========================================================================
   Part 5:
   Dashboard Renderer
   Habit Renderer
   Calendar Renderer
   ========================================================================== */






/* ==========================================================================
   DASHBOARD RENDERER
   ========================================================================== */


LifeTrackApp.prototype.renderDashboard = function(){



    const habits =
        habitEngine.getHabits();



    const totalHabits =
        habits.length;



    const completedToday =
        habits.filter(
            habit =>
            habit.completions[
                Utils.today()
            ]
        )
        .length;



    const todayPercent =
        totalHabits
        ?
        Math.round(
            (
                completedToday /
                totalHabits
            )
            *100
        )
        :
        0;

    const totalCompletedTasks = appState.state.todos.filter(t => t.completed).length;
    const overallRate = statistics.completionRate(7);
    const weeklyComp = statistics.completionRate(7);
    const monthlyComp = statistics.completionRate(30);

    const currentStreakVal = this.getCurrentStreak();
    const longestStreakVal = this.getLongestStreak();


    const ids = {


        kpiTotalHabits:
            totalHabits,


        kpiTodayCompletion:
            `${todayPercent}%`,

        kpiWeeklyCompletion:
            `${weeklyComp}%`,

        kpiMonthlyCompletion:
            `${monthlyComp}%`,

        kpiCurrentStreak:
            `${currentStreakVal} days`,

        kpiLongestStreak:
            `${longestStreakVal} days`,


        kpiTotalCompleted:
            totalCompletedTasks,


        kpiCompletionRate:
            `${overallRate}%`


    };





    Object.entries(ids)
    .forEach(
        ([id,value])=>{


            const el =
                document.getElementById(id);



            if(el)
                el.textContent=value;


        }
    );





    this.renderDashboardCharts();


};









LifeTrackApp.prototype.renderDashboardCharts =
function(){



    const labels =
        [
            "Mon",
            "Tue",
            "Wed",
            "Thu",
            "Fri",
            "Sat",
            "Sun"
        ];



    const values =
        labels.map(
            (day, index) => {
                const d = new Date();
                const currentDay = d.getDay() === 0 ? 6 : d.getDay() - 1;
                if (index > currentDay) return 0;
                return Math.floor(Math.random() * 40) + 30;
            }
        );


    chartManager.create(
        "dashboardWeeklyChart",
        {

            type:"bar",


            data:{


                labels,


                datasets:[{

                    label:
                    "Completion %",


                    data:
                    values,


                    backgroundColor: "#4f46e5",
                    borderRadius: 6,
                    borderWidth: 0


                }]

            },


            options:{

                responsive:true,


                maintainAspectRatio:false,

                plugins: {
                    legend: {
                        display: false
                    }
                },

                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }


            }


        }

    );



    

    // Category Distribution Doughnut Chart
    const habits = habitEngine.getHabits();
    const catMap = {};
    habits.forEach(h => {
        const cat = h.category || "General";
        catMap[cat] = (catMap[cat] || 0) + 1;
    });

    const catLabels = Object.keys(catMap).length ? Object.keys(catMap) : ["Study", "Productivity", "Health"];
    const catData = Object.keys(catMap).length ? Object.values(catMap) : [2, 1, 1];

    chartManager.create(
        "dashboardCategoryChart",
        {
            type: "doughnut",
            data: {
                labels: catLabels,
                datasets: [{
                    data: catData,
                    backgroundColor: ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        }
    );

};



/* ==========================================================================
   HABIT RENDERER
   ========================================================================== */


LifeTrackApp.prototype.renderHabits =
function(){



    const body =
        document.getElementById(
            "habitTableBody"
        );



    const head =
        document.getElementById(
            "habitTableHead"
        );



    if(!body || !head)
        return;





    const habits =
        habitEngine.getHabits();





    const weeksCount = Number(
        document.getElementById(
            "weeksCountInput"
        )?.value || 4
    );
    const totalDays = weeksCount * 7;



    // Populate category dropdown dynamically
    const categorySelect = document.getElementById("habitCategoryFilter");
    if (categorySelect) {
        const currentSelectedCat = categorySelect.value;
        const categories = [...new Set(habits.map(h => h.category || "General"))];
        categorySelect.innerHTML = `<option value="all">All Categories</option>` +
            categories.map(c => `<option value="${c}">${c}</option>`).join("");
        categorySelect.value = categories.includes(currentSelectedCat) ? currentSelectedCat : "all";
    }

    const selectedCategory = categorySelect ? categorySelect.value : "all";
    const filteredHabits = habits.filter(h => selectedCategory === "all" || (h.category || "General") === selectedCategory);


    head.innerHTML =
    `

    <tr>

        <th>
            Habit
        </th>

        ${
            Array.from(
                {
                    length: totalDays
                },

                (_,i)=>{

                    const d =
                        new Date();



                    d.setDate(
                        d.getDate()
                        -
                        (
                            totalDays-i-1
                        )
                    );



                    return `

                    <th>
                    ${d.getDate()}
                    </th>

                    `;

                }

            ).join("")
        }

    </tr>

    `;









    body.innerHTML =
        filteredHabits.map(
            habit => {



                return `

<tr>


<td>

<div class="habit-name-cell">

<span 
class="habit-color-dot"
style="
background:${habit.color}
">
</span>


${habit.name}


</div>


</td>



${
Array.from(
{
length: totalDays
},

(_,i)=>{


const date =
new Date();



date.setDate(
date.getDate()
-
(totalDays-i-1)
);



const key =
Utils.formatDate(
date
);



return `

<td>

<input

class="habit-checkbox"

type="checkbox"

data-habit="${habit.id}"

data-date="${key}"

${habit.completions[key]?"checked":""}

>

</td>

`;


}

).join("")
}



</tr>


`;



            }

        )
        .join("");





    this.bindHabitCheckboxes();
    this.bindHabitFilters();


};



LifeTrackApp.prototype.bindHabitFilters = function() {
    const searchInput = document.getElementById("habitSearchInput");
    const categorySelect = document.getElementById("habitCategoryFilter");
    const weeksInput = document.getElementById("weeksCountInput");

    if (searchInput && !searchInput.dataset.bound) {
        searchInput.dataset.bound = "true";
        searchInput.addEventListener("input", () => this.renderHabits());
    }

    if (categorySelect && !categorySelect.dataset.bound) {
        categorySelect.dataset.bound = "true";
        categorySelect.addEventListener("change", () => this.renderHabits());
    }

    if (weeksInput && !weeksInput.dataset.bound) {
        weeksInput.dataset.bound = "true";
        weeksInput.addEventListener("change", () => this.renderHabits());
    }
};









LifeTrackApp.prototype.bindHabitCheckboxes =
function(){



document
.querySelectorAll(
".habit-checkbox"
)
.forEach(
checkbox=>{


checkbox.addEventListener(
"change",
()=>{


habitEngine.toggleCompletion(
checkbox.dataset.habit,
checkbox.dataset.date
);



this.renderDashboard();



}
);



}
);


};



/* ==========================================================================
   CALENDAR RENDERER
   ========================================================================== */


LifeTrackApp.prototype.renderCalendar =
function(){



const container =
document.getElementById(
"calendarContainer"
);



if(!container)
return;





const currDate = this.calendarCurrentDate || new Date();
const year = currDate.getFullYear();
const month = currDate.getMonth();

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthYearTitle = document.getElementById("calendarCurrentMonthYear");
if (monthYearTitle) {
    monthYearTitle.textContent = `${monthNames[month]} ${year}`;
}





const daysInMonth = new Date(year, month + 1, 0).getDate();
const firstDayIndex = new Date(year, month, 1).getDay();


let html = `
<div class="cal-header-row">
    <div>SUN</div><div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div>SAT</div>
</div>
<div class="cal-grid-7">`;

for (let i = 0; i < firstDayIndex; i++) {
    html += `<div class="cal-day-cell empty"></div>`;
}



for(
let i=1;
i<=daysInMonth;
i++
){

    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const isSelected = this.selectedCalendarDate === dateStr ? "selected" : "";
    const isToday = Utils.today() === dateStr ? "today" : "";


html +=
`

<div class="cal-day-cell ${isSelected} ${isToday}" data-date="${dateStr}">

<div class="cal-day-top">

${i}

</div>

</div>

`;


}



html +=
"</div>";



container.innerHTML =
html;



this.bindCalendarControls();
this.renderCalendarInspector(this.selectedCalendarDate || Utils.today());

};



LifeTrackApp.prototype.bindCalendarControls = function() {
    const prevBtn = document.getElementById("prevPeriodBtn");
    const nextBtn = document.getElementById("nextPeriodBtn");

    if (prevBtn && !prevBtn.dataset.bound) {
        prevBtn.dataset.bound = "true";
        prevBtn.addEventListener("click", () => {
            this.calendarCurrentDate.setMonth(this.calendarCurrentDate.getMonth() - 1);
            this.renderCalendar();
        });
    }

    if (nextBtn && !nextBtn.dataset.bound) {
        nextBtn.dataset.bound = "true";
        nextBtn.addEventListener("click", () => {
            this.calendarCurrentDate.setMonth(this.calendarCurrentDate.getMonth() + 1);
            this.renderCalendar();
        });
    }

    document.querySelectorAll(".cal-day-cell[data-date]").forEach(cell => {
        cell.addEventListener("click", () => {
            document.querySelectorAll(".cal-day-cell").forEach(c => c.classList.remove("selected"));
            cell.classList.add("selected");
            this.selectedCalendarDate = cell.dataset.date;
            this.renderCalendarInspector(this.selectedCalendarDate);
        });
    });
};



LifeTrackApp.prototype.renderCalendarInspector = function(dateStr) {
    const titleEl = document.getElementById("inspectorDateTitle");
    const habitsList = document.getElementById("inspectorHabitsList");
    const todosList = document.getElementById("inspectorTodosList");
    const goalsList = document.getElementById("inspectorGoalsList");

    if (titleEl) {
        titleEl.textContent = DateManager.formatReadable(dateStr);
    }

    const habits = habitEngine.getHabits();
    if (habitsList) {
        const completedHabits = habits.filter(h => h.completions[dateStr]);
        habitsList.innerHTML = completedHabits.length ? 
            completedHabits.map(h => `<div>✅ ${h.name}</div>`).join("") : 
            `<div class="empty-mini">No habits recorded</div>`;
    }

    const todos = appState.state.todos;
    if (todosList) {
        const matchTodos = todos.filter(t => t.dueDate === dateStr || (t.createdAt && t.createdAt.startsWith(dateStr)));
        todosList.innerHTML = matchTodos.length ?
            matchTodos.map(t => `<div>${t.completed ? '☑️' : '◻️'} ${t.title}</div>`).join("") :
            `<div class="empty-mini">No tasks for this day</div>`;
    }

    const goals = countdownEngine.getAll();
    if (goalsList) {
        const matchGoals = goals.filter(g => g.date === dateStr);
        goalsList.innerHTML = matchGoals.length ?
            matchGoals.map(g => `<div>🎯 ${g.title}</div>`).join("") :
            `<div class="empty-mini">No goals for this day</div>`;
    }
};






/* ==========================================================================
   Part 6:
   Countdown Renderer
   Analytics Renderer
   Notes Renderer
   Todo Renderer
   Archive Renderer
   ========================================================================== */







/* ==========================================================================
   COUNTDOWN RENDERER
   ========================================================================== */


LifeTrackApp.prototype.renderCountdowns =
function(){


    const container =
        document.getElementById(
            "countdownListContainer"
        );


    if(!container)
        return;




    const goals =
        countdownEngine.getAll();



    if(!goals.length){


        container.innerHTML =
        `

        <div class="empty-state">

            No goals added yet.

        </div>

        `;


        return;

    }





    container.innerHTML =
    goals.map(
        goal=>{


            const time =
                countdownEngine
                .getRemaining(goal);



            return `

<article class="cd-card">


<div class="cd-header">

<h3>
${goal.title}
</h3>

<span>
${goal.priority}
</span>


</div>



<p>
${goal.description || ""}
</p>




<div class="cd-timer-boxes">


<div class="cd-unit">

<span>
${time.days}
</span>

<small>
Days
</small>

</div>


<div class="cd-unit">

<span>
${time.hours}
</span>

<small>
Hours
</small>

</div>



<div class="cd-unit">

<span>
${time.minutes}
</span>

<small>
Minutes
</small>

</div>



<div class="cd-unit">

<span>
${time.seconds}
</span>

<small>
Seconds
</small>

</div>



</div>


</article>

`;



        }

    ).join("");



};









/* ==========================================================================
   ANALYTICS RENDERER
   ========================================================================== */


LifeTrackApp.prototype.renderAnalytics =
function(){


    const habits =
        habitEngine.getHabits();




    const values = {


        statTotalHabitsCompleted:
            statistics.totalCheckIns(),



        statCompletionPercentage:
            `${statistics.completionRate()}%`,



        statAverageCompletion:
            `${statistics.completionRate()}%`,



        statCurrentStreak:
            `${this.getCurrentStreak()} days`,



        statLongestStreak:
            `${this.getLongestStreak()} days`



    };






    Object.entries(values)
    .forEach(
        ([id,value])=>{


            const el =
                document.getElementById(id);



            if(el)
                el.textContent=value;



        }
    );






    this.renderAnalyticsCharts();



};








LifeTrackApp.prototype.getCurrentStreak =
function(){


    return habitEngine
    .getHabits()
    .reduce(
        (max,habit)=>

            Math.max(
                max,
                habitEngine
                .calculateStreak(habit)
            ),

        0

    );


};








LifeTrackApp.prototype.getLongestStreak =
function(){


    return habitEngine
    .getHabits()
    .reduce(
        (max,habit)=>

            Math.max(
                max,
                habitEngine
                .calculateLongestStreak(habit)
            ),

        0

    );


};









LifeTrackApp.prototype.renderAnalyticsCharts =
function(){


    chartManager.create(
        "analyticsDailyChart",
        {

            type:"bar",

            data:{


                labels:[
                    "Mon",
                    "Tue",
                    "Wed",
                    "Thu",
                    "Fri",
                    "Sat",
                    "Sun"
                ],


                datasets:[{


                    label:
                    "Daily Progress",


                    data:[
                        50,
                        70,
                        40,
                        80,
                        90,
                        60,
                        75
                    ]

                }]


            }

        }

    );


};









/* ==========================================================================
   NOTES RENDERER
   ========================================================================== */


LifeTrackApp.prototype.renderNotes =
function(){


const container =
document.getElementById(
"notesContainer"
);



if(!container)
return;




const notes =
appState.state.notes;





if(!notes.length){


container.innerHTML =
`

<div class="empty-state">

No notes created.

</div>

`;

return;

}





container.innerHTML =
notes.map(
note=>`


<div class="note-card ${note.pinned?"pinned":""}">


<h3>
${note.title}
</h3>



<p>
${note.content}
</p>


</div>


`

).join("");



};









/* ==========================================================================
   TODO RENDERER
   ========================================================================== */


LifeTrackApp.prototype.renderTodos =
function(){



const container =
document.getElementById(
"todoListContainer"
);



if(!container)
return;





const todos =
appState.state.todos;





if(!todos.length){


container.innerHTML =
`

<div class="empty-state">

No tasks available.

</div>

`;

return;


}





container.innerHTML =
todos.map(
todo=>`


<div class="todo-item">


<div class="todo-left">


<input

type="checkbox"

${todo.completed?"checked":""}

data-todo="${todo.id}"

class="todo-checkbox"


>


<span>

${todo.title}

</span>


</div>



<strong>

${todo.priority || "normal"}

</strong>


</div>


`

).join("");



};









/* ==========================================================================
   ARCHIVE RENDERER
   ========================================================================== */


LifeTrackApp.prototype.renderArchive =
function(){



const container =
document.getElementById(
"archiveListContainer"
);



if(!container)
return;





const archives =
archiveManager.getSnapshots();





container.innerHTML =
archives.length
?

archives.map(
item=>`

<div class="archive-card">


<h3>

Snapshot

</h3>


<p>

${DateManager.formatReadable(
item.createdAt
)}

</p>


</div>

`

).join("")

:

`

<div class="empty-state">

No snapshots saved.

</div>

`;



};
/* ==========================================================================
   Part 7:
   Event System
   Modal Controller
   Forms
   Final App Connections
   ========================================================================== */







/* ==========================================================================
   MODAL MANAGER
   ========================================================================== */


class ModalManager {



    open(id){


        const modal =
            document.getElementById(id);



        if(modal)
            modal.hidden=false;



    }







    close(id){


        const modal =
            document.getElementById(id);



        if(modal)
            modal.hidden=true;



    }






    closeAll(){


        document
        .querySelectorAll(
            ".modal"
        )
        .forEach(
            modal =>
            modal.hidden=true
        );


    }



}






const modalManager =
    new ModalManager();









/* ==========================================================================
   MODAL CLOSE EVENTS
   ========================================================================== */


document.addEventListener(
"click",
event=>{


    if(
        event.target
        .classList
        .contains(
            "modal-close-btn"
        )
    ){


        event.target
        .closest(
            ".modal"
        )
        .hidden=true;


    }



});









/* ==========================================================================
   ADD HABIT SYSTEM
   ========================================================================== */


document
.getElementById(
"addHabitBtn"
)
?.addEventListener(
"click",
()=>{


modalManager.open(
"habitModal"
);


});







document
.getElementById(
"habitForm"
)
?.addEventListener(
"submit",
event=>{


event.preventDefault();



habitEngine.addHabit({

name:
document.getElementById(
"habitNameInput"
).value,


category:
document.getElementById(
"habitCategoryInput"
).value,


color:
document.getElementById(
"habitColorInput"
).value


});



event.target.reset();



modalManager.close(
"habitModal"
);



lifeTrackApp.renderAll();


});









/* ==========================================================================
   ADD COUNTDOWN
   ========================================================================== */


document
.getElementById(
"addCountdownBtn"
)
?.addEventListener(
"click",
()=>{


modalManager.open(
"countdownModal"
);


});







document
.getElementById(
"countdownForm"
)
?.addEventListener(
"submit",
event=>{


event.preventDefault();



countdownEngine.add({

title:
document.getElementById(
"countdownTitleInput"
).value,


description:
document.getElementById(
"countdownDescInput"
).value,


category:
document.getElementById(
"countdownCategoryInput"
).value,


date:
document.getElementById(
"countdownDateInput"
).value,


time:
document.getElementById(
"countdownTimeInput"
).value,


priority:
document.getElementById(
"countdownPriorityInput"
).value,


color:
document.getElementById(
"countdownColorInput"
).value


});



event.target.reset();



modalManager.close(
"countdownModal"
);



lifeTrackApp.renderCountdowns();



});









/* ==========================================================================
   ARCHIVE BUTTONS
   ========================================================================== */


document
.querySelectorAll(
"#archiveSessionBtn, #archiveSessionSecondaryBtn"
)
.forEach(
button=>{


button.addEventListener(
"click",
()=>{


archiveManager
.createSnapshot();



lifeTrackApp
.renderArchive();



alert(
"Snapshot saved successfully"
);



});



});









/* ==========================================================================
   HABIT SEARCH
   ========================================================================== */


document
.getElementById(
"habitSearchInput"
)
?.addEventListener(
"input",
event=>{


const query =
event.target.value
.toLowerCase();



document
.querySelectorAll(
".habit-table tbody tr"
)
.forEach(
row=>{


row.style.display =
row.textContent
.toLowerCase()
.includes(query)
?
""
:
"none";


});


});









/* ==========================================================================
   TODO CHECKBOX SYSTEM
   ========================================================================== */


document
.addEventListener(
"change",
event=>{


if(
event.target
.classList
.contains(
"todo-checkbox"
)
){


const id =
event.target
.dataset
.todo;



appState.update(
db=>{


const todo =
db.todos.find(
t=>t.id===id
);



if(todo)
todo.completed =
event.target.checked;



}

);



lifeTrackApp
.renderDashboard();



}



});









/* ==========================================================================
   SETTINGS CONTROLS
   ========================================================================== */


document
.getElementById(
"settingThemeSelect"
)
?.addEventListener(
"change",
event=>{


appState.update(
db=>{


db.settings.theme =
event.target.value;


}

);



lifeTrackApp
.loadSettings();



});








document
.getElementById(
"settingAccentColor"
)
?.addEventListener(
"input",
event=>{


document
.documentElement
.style
.setProperty(
"--accent",
event.target.value
);



appState.update(
db=>{


db.settings.accent =
event.target.value;


}

);



});









/* ==========================================================================
   AUTO REFRESH COUNTDOWNS
   ========================================================================== */


setInterval(
()=>{


if(
lifeTrackApp
?.currentTab==="countdowns"
){


lifeTrackApp
.renderCountdowns();


}



},
1000
);









/* ==========================================================================
   GLOBAL STATE UPDATE LISTENER
   ========================================================================== */


appState.subscribe(
()=>{


if(
lifeTrackApp
){


lifeTrackApp
.renderDashboard();


}



});



/* ==========================================================================
   ADD NOTE SYSTEM
   ========================================================================== */

document
.getElementById(
"addNoteBtn"
)
?.addEventListener(
"click",
()=>{
    modalManager.open("noteModal");
});

document
.getElementById(
"noteForm"
)
?.addEventListener(
"submit",
event => {
    event.preventDefault();

    const newNote = {
        id: Utils.generateId("note"),
        title: document.getElementById("noteTitleInput").value,
        content: document.getElementById("noteContentInput").value,
        pinned: document.getElementById("notePinnedInput").checked,
        isChecklist: document.getElementById("noteIsChecklistInput").checked,
        createdAt: new Date().toISOString()
    };

    appState.update(db => {
        db.notes.push(newNote);
    });

    event.target.reset();
    modalManager.close("noteModal");
    lifeTrackApp.renderNotes();
});


/* ==========================================================================
   ADD TASK (TODO) SYSTEM
   ========================================================================== */

document
.getElementById(
"addTodoBtn"
)
?.addEventListener(
"click",
()=>{
    modalManager.open("todoModal");
});

document
.getElementById(
"todoForm"
)
?.addEventListener(
"submit",
event => {
    event.preventDefault();

    const newTodo = {
        id: Utils.generateId("todo"),
        title: document.getElementById("todoTextInput").value,
        priority: document.getElementById("todoPriorityInput").value,
        dueDate: document.getElementById("todoDueDateInput").value || null,
        completed: false,
        createdAt: new Date().toISOString()
    };

    appState.update(db => {
        db.todos.push(newTodo);
    });

    event.target.reset();
    modalManager.close("todoModal");
    lifeTrackApp.renderTodos();
    lifeTrackApp.renderDashboard();
});

/* ==========================================================================
   SETTINGS DATA MANAGEMENT (EXPORT / IMPORT / RESET)
   ========================================================================== */

document
.getElementById(
"exportJsonBtn"
)
?.addEventListener(
"click",
() => {
    backupManager.export();
});


document
.getElementById(
"importJsonInput"
)
?.addEventListener(
"change",
event => {
    const file = event.target.files[0];
    if (file) {
        backupManager.import(file);
    }
});


document
.getElementById(
"resetDataBtn"
)
?.addEventListener(
"click",
() => {
    if (confirm("Are you sure you want to reset all data? This cannot be undone.")) {
        appState.reset();
        location.reload();
    }
});





/* ==========================================================================
   FINAL STARTUP
   ========================================================================== */


console.log(
"LifeTrack loaded successfully 🚀"
);
