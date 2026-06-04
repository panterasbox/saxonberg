// Basket for the games room.
// -- Tabitha 94
inherit ObjectCode;

#define GAMES ([ "connect4" : "/usr/toothpick/games/c4",  \
                 "gobang"   : "/usr/toothpick/games/gb",  \
                 "othello"  : "/usr/toothpick/games/ot"   ]) 

void extra_create()
{
    add("id","basket");
    set("short", "A basket full of games, dangling from beneath the sign" );
    set("long",
      "Chock-full of the latest games from Toothpick.  You can <take> a version of Connect4, Gobang, or Othello." );
    set("gettable", 0 );
}

void extra_init()
{
    add_action( "take", "take" );
}

status take( string str )
{
    if( str != "connect4" && str != "gobang" && str != "othello" )
    {
	write( "Games available are Connect4, Gobang and Othello.\n"+
	  "Type <take connect4> or <take gobang> or <take othello>.\n");
	return 1;
    }
    move_object( clone_object( GAMES[ str ] ), THISP );
    write( "You take a " + str + " board from the basket.\n" );
    say( PNAME + " takes a " + str + " board from the basket.\n" );
    return 1;
}
