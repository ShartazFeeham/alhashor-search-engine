import "./App.css";
import Search from "./Search/Search";
import 'bootstrap/dist/css/bootstrap.min.css';
import NavBar from "./Navbar/Navbar";
import Books from "./Books/Books";
import Topics from "./Topics/Topics";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Home from "./Home/Home";
import NotFound from "./NotFound/NotFound";

function App() {
  return (
    <Router>
      <div>
        <NavBar />
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/books' element={<Books />} />
          <Route path='/search' element={<Search />} />
          <Route path='/topics' element={<Topics />} />
          <Route path='*' element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  );
}
export default App;
