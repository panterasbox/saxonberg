inherit RoomPlusCode;

#define PAGE_1 \
"*** PAGE 1 *** SET COMMANDS ***\n" \
"    There is a command called 'set' that you can use to change some of the " \
"aspects of your environment.  Typing 'set' by itself will list the " \
"variables you can set on or off.\n" \
"    For instance, if you only want to view the title of a room and not the " \
"long description, you can 'set brief on'; and of course, 'set brief off' " \
"will let you view the long descriptions again.\n" \
"    If you have a color monitor, you can 'set ansi on'.  Also, if you would " \
"like to be able to view room descriptions in color (though not all rooms " \
"are set to color), use 'set ansi-shorts on' and 'set ansi-longs on'.\n"

#define PAGE_2 \
"*** PAGE 2 *** SET COMMANDS (cont.) ***\n" \
"    If you want to display a status line when you are in combat, use " \
"'set hpw on'.  This is the hit points watch, which measures the damage " \
"you take.\n" \
"    The next two set options allow you to flee from a fight when you get " \
"to a certain percentage of damage, and to choose the direction you want to " \
"flee.  Use 'set wimpy <number from 1-100>'; for example, 'set wimpy 50' " \
"will set your wimpy to 50%.  Use 'set wimpydir north' to set your flee " \
"direction to north, or you can use 'set wimpydir random' so that you will " \
"flee in a random direction.\n"

#define PAGE_3 \
"*** PAGE 3 *** ALIASES AND NICKNAMES ***\n" \
"    Aliases are handy for frequently-used commands.  You can substitute " \
"a multi-word command with a single word.  For example:\n" \
"        alias tl tell locus\n" \
"will allow you to do:\n" \
"        tl Hi there!  How are you?\n" \
"in place of:\n" \
"        tell locus Hi there!  How are you?\n" \
"\n" \
"    Nicknames work similarly, for example:\n" \
"        nickname torenthal tor\n" \
"        tell tor Hello.\n"

#define POSTER \
"======= HOW TO USE THE GUIDE TO EOTL =======\n" \
"\n" \
"To see how tough a monster or a player is, type 'query <name>' " \
"or 'consider <name>'.\n" \
"\n" \
"As an eval one newbie, you have the ability to 'stupor', which allows you " \
"to exchange fatigue for hit points.\n" \
"\n" \
"'beam me up' allows you to trans from anywhere in the game (except jail) " \
"to the EotL Lounge.\n" \
"\n" \
"After you kill a monster, 'Dest corpse' will get rid of the body, which " \
"helps clear up game resources and allows for less lag.\n" \
"\n" \
"If you need more help with the guide, use 'info guide'.  That concludes " \
"this portion of the study lab.  If you have already read the notebook, " \
"leave east to continue with your studies."

void extra_create()
{
    set( "short", "A Study Lab" );
    set( "day_long",
      "This is a small lab in the school where you can get special help with "
      "certain objects on the game.  There is a large table here with chairs "
      "around it, and a notebook titled, 'Basic Player Commands'.  On one "
      "wall is a poster with the heading, 'The Guide, and How to Use It'.  "
      "Why don't you sit, read the book, and find out more?"
    );
    set( "day_light", WELL_LIT );
    set( "night_light", WELL_LIT );
    set( "exits", ([
      "east": "room03",
    ]) );
    set( "descs", ([
      ({ "notebook", "book" }):
          "This notebook describes how to use 'set', 'alias', and "
          "'nickname'.  It consists of three pages.  To read each one, use "
          "the command, 'read page <#>'.",
      "poster":
          "This is a detailed poster on how to use the guide.  Why don't "
          "you read it?",
      ({ "table", "large table", "oak table", "large oak table" }):
          "This is a large oak table with a notebook on top of it.",
      ({ "chair", "chairs" }):
          "These are generic green plastic chairs.",
    ]) );
}

void extra_init()
{
    add_action( "do_read", "read" );
}

status do_read( string str )
{
    int page_num;

    notify_fail( "What do you want to read?\n" );
    if( !str || ( str != "poster" && sscanf( str, "page %d", page_num ) != 1 ) )
        return( 0 );
    if( str == "poster" )
    {
        say( sprintf( "%s reads the poster.\n", PNAME ) );
        return( write( strformat( POSTER ) ), 1 );
    }
    if( ( page_num < 0 ) || ( page_num > 3 ) )
        return( write( "That is not a valid page.\n" ), 1 );
    say( sprintf( "%s reads a page from the book.\n" ) );
    switch( page_num )
    {
        case( 1 ): write( strformat( PAGE_1 ) ); break;
        case( 2 ): write( strformat( PAGE_2 ) ); break;
        default:   write( strformat( PAGE_3 ) );
    }
    return( 1 );
}
