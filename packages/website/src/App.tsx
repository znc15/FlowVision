import { Hero, Features, Screenshots, TechStack, MCP, Download, Footer } from './sections'

export default function App() {
  return (
    <div className="min-h-screen">
      <Hero />
      <Features />
      <Screenshots />
      <MCP />
      <TechStack />
      <Download />
      <Footer />
    </div>
  )
}
