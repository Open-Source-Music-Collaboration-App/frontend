import axios from "axios"
const baseUrl = 'http://localhost:3001/projects'

const getProjects = () => {
    axios.get(baseUrl)
        .then(data => console.log(data))
}




export default {
    getProjects
}