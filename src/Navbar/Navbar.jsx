import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import { Link } from 'react-router-dom';
import './Navbar.css';

function NavBar() {
    return (
        <div className="fw-bold">
            <Navbar className='navbg' variant="dark">
                <Container>
                    <Navbar.Brand className='hm' as={Link} to='/'>
                        <img
                            src="/photos/Logo/logo4.png"
                            width="80"
                            height="60"
                            className="d-inline-block d-sm-none align-top"
                            alt="হোম"
                        />
                        <img
                            src="/photos/Logo/logo7.png"
                            width="200"
                            height="45"
                            className="d-none d-sm-inline-block align-top"
                            alt="হোম"
                        />
                    </Navbar.Brand>
                    <Nav className="navbar-right">
                        <Nav.Link as={Link} to="/">
                            <img
                                src="/photos/NavIcons/home.png"
                                width="30"
                                height="30"
                                className="d-inline-block align-top"
                                alt="হোম"
                            />হোম
                        </Nav.Link>

                        <Nav.Link as={Link} to="/search">
                            <img
                                src="/photos/NavIcons/search.png"
                                width="30"
                                height="30"
                                className="d-inline-block align-top"
                                alt="সার্চ"
                            />সার্চ
                        </Nav.Link>

                        <Nav.Link as={Link} to="/books">
                            <img
                                src="/photos/NavIcons/books.png"
                                width="30"
                                height="30"
                                className="d-inline-block align-top"
                                alt="বই"
                            />হাদীস বই
                        </Nav.Link>


                        <Nav.Link as={Link} to="/topics">
                            <img
                                src="/photos/NavIcons/topics.png"
                                width="30"
                                height="30"
                                className="d-inline-block align-top"
                                alt="বিষয়ভিত্তিক হাদীস"
                            />বিষয়ভিত্তিক হাদীস
                        </Nav.Link>


                    </Nav>
                </Container>
            </Navbar>
            <br />
        </div>
    );
}

export default NavBar;
