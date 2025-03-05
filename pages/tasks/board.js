import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'

export default function TaskBoard() {
  const router = useRouter()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const columns = ['pending', 'in-progress', 'completed']

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (!user) {
      router.push('/')
      return
    }
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks')
      const data = await response.json()
      setTasks(data)
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        fetchTasks() // Refresh tasks after update
      }
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  const getTasksByStatus = (status) => {
    return tasks.filter(task => task.status === status)
  }

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('taskId', taskId)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = async (e, status) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('taskId')
    await updateTaskStatus(taskId, status)
  }

  return (
    <DashboardLayout>
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Task Board</h1>
          <button 
            onClick={() => router.push('/tasks/new')}
            className="btn btn-primary"
          >
            Add Task
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {columns.map((column) => (
              <div 
                key={column}
                className="bg-base-200 p-4 rounded-lg"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column)}
              >
                <h2 className="text-lg font-semibold capitalize mb-4">{column}</h2>
                <div className="space-y-2">
                  {getTasksByStatus(column).map((task) => (
                    <div 
                      key={task.task_id}
                      className="card bg-base-100 shadow-sm cursor-move"
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.task_id)}
                    >
                      <div className="card-body p-4">
                        <h3 className="card-title text-sm">{task.name}</h3>
                        <p className="text-xs text-gray-500">
                          Project: {task.project_id}
                        </p>
                        <p className="text-xs text-gray-500">
                          Due: {new Date(task.deadline).toLocaleDateString()}
                        </p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-gray-500">
                            Assigned to: {task.assigned_to}
                          </span>
                          <button
                            onClick={() => router.push(`/tasks/${task.task_id}`)}
                            className="btn btn-xs btn-ghost"
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
} 