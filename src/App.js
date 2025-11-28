import './App.css';
import Navbar from './Components/Navbar';
import Home from './Components/Home';
import AnalyzeFile from './Components/AnalyzeFile';
import AnalyzeURL from './Components/AnalyzeURL';
import AnalyzeLog from './Components/AnalyzeLog';
import News from './Components/News';
import Vulnerabilities from './Components/Vulnerabilities';
import HashGenerator from './Components/HashGenerator';
import About from './Components/About';
import Contact from './Components/Contact';
import Chatbot from './Components/Chatbot';

import { HashRouter, Routes, Route } from "react-router-dom";

function App() {
  return (
    <HashRouter>
      <Navbar />
      <div className="pt-16">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/AnalyzeFile" element={<AnalyzeFile />} />
          <Route path="/AnalyzeURL" element={<AnalyzeURL />} />
          <Route path="/AnalyzeLog" element={<AnalyzeLog />} />
          <Route path="/News" element={<News />} />
          <Route path="/Vulnerabilities" element={<Vulnerabilities />} />
          <Route path="/HashGenerator" element={<HashGenerator />} />
          <Route path="/About" element={<About />} />
          <Route path="/Contact" element={<Contact />} />
        </Routes>
      </div>
      <Chatbot />
    </HashRouter>
  );
}

export default App;
