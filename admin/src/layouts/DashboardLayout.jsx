import React from 'react'
import { Outlet } from 'react-router-dom'

function DashboardLayout() {
  return (
    <div>
       <h1> slidebar</h1>
       <h1> navbar</h1>
        <Outlet/>
    </div>
  )
}

export default DashboardLayout