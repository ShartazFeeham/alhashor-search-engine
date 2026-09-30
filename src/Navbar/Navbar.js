import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import './Navbar.css';

function NavBar(props) {
    return (
        <b>
            <Navbar className='navbg' variant="dark">
                <Container>
                    <Navbar.Brand className='hm' href='/'>
                        {window.screen.width < 580 ?
                            <img
                                src="../photos/Logo/logo4.png"
                                width="80"
                                height="60"
                                className="d-inline-block align-top"
                                alt="হোম"
                            /> :
                            <img
                                src="../photos/Logo/logo7.png"
                                width="200"
                                height="45"
                                className="d-inline-block align-top"
                                alt="হোম"
                            />
                        }
                    </Navbar.Brand>
                    <Nav className="navbar-right">
                        <Nav.Link href="/">
                            <img
                                src="../photos/NavIcons/home.png"
                                width="30"
                                height="30"
                                className="d-inline-block align-top"
                                alt="হোম"
                            />হোম
                        </Nav.Link>

                        <Nav.Link href="/search">
                            <img
                                src="../photos/NavIcons/search.png"
                                width="30"
                                height="30"
                                className="d-inline-block align-top"
                                alt="সার্চ"
                            />সার্চ
                        </Nav.Link>

                        <Nav.Link href="/books">
                            <img
                                src="../photos/NavIcons/books.png"
                                width="30"
                                height="30"
                                className="d-inline-block align-top"
                                alt="বই"
                            />হাদীস বই
                        </Nav.Link>


                        <Nav.Link href="/topics">
                            <img
                                src="../photos/NavIcons/topics.png"
                                width="30"
                                height="30"
                                className="d-inline-block align-top"
                                alt="বিষয়ভিত্তিক হাদীস"
                            />বিষয়ভিত্তিক হাদীস
                        </Nav.Link>


                    </Nav>
                </Container>
            </Navbar>
            <br />
        </b>
    );
}

export default NavBar;