import "./App.css";
import Search from "./Search/Search";
import 'bootstrap/dist/css/bootstrap.min.css';
import NavBar from "./Navbar/Navbar";
import { useState } from "react";
import Books from "./Books/Books";
import Topics from "./Topics/Topics";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Home from "./Home/Home";

function App() {
  const [, setDisplay] = useState(0);
  window.history.pushState(this, null, null)
  window.history.pushState(this, null, null)
  window.history.pushState(this, null, null)
  window.history.pushState(this, null, null)
  window.history.pushState(this, null, null)
  return (
    <div>
      <NavBar setDisplay={setDisplay} />
      <Router>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/books' element={<Books />} />
          <Route path='/search' element={<Search />} />
          <Route path='/topics' element={<Topics />} />
        </Routes>
      </Router>
    </div>
  );
}
export default App;