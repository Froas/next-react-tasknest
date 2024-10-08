
const Header = () => {
    return (
      <header className="bg-gray-800 p-4 text-white">
        <nav>
          <ul className="flex space-x-4">
            <li><a className="border-2 border-sky-400 w-40" href="/">Главная</a></li>
            <li><a className="border-2 border-sky-400 w-40" href="/goal">Goal</a></li>
            <li><a className="border-2 border-sky-400 w-40" href="/milestone">Milestone</a></li>
            <li><a className="border-2 border-sky-400 w-40" href="/task">Task</a></li>
            <li><a className="border-2 border-sky-400 w-40" href="/subtask">Subtask</a></li>
            <li><a className="border-2 border-sky-400 w-40" href="/todo">Todo</a></li>
            <li><a className="border-2 border-sky-400 w-40" href="/event">Event</a></li>
            <li><a className="border-2 border-sky-400 w-40" href="/logout">Logout</a></li>
          </ul>
        </nav>
      </header>
    );
  };
  
  export default Header;
  