import React from "react"
import Nav from "@/components/web/Nav"
import Footer from "@/components/web/Footer"
 
 

export default function Layout({ children }) {
  return (
   
      <div  >
        <Nav/>
          <div className="min-h-full bg-snow-100">{children}</div>
        <Footer/>
          
      </div>
 
  )
}
