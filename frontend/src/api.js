import axios from 'axios'

const client = axios.create({ baseURL: '/api/v1/task' })

export const api = {
  list:   ()         => client.get('/list-task').then(r => r.data),
  create: (body)     => client.post('/create-task', body).then(r => r.data),
  update: (id, body) => client.patch(`/update-task/${id}`, body).then(r => r.data),
  delete: (id)       => client.delete(`/delete-task/${id}`).then(r => r.data),
}
