//  Newbie.h
//  Written by Hannah on 10/92 as an include file;
//  92-12 Hannah -- Modifications and cleaning up
//  94-05-04 Hannah -- Common room functions added
//  99-09 Edited by Diablo
//  This file is #included into the rooms of the newbie area.
//  It looks for high-level players intruding into this area,
//  and boots them out.  

inherit RoomPlusCode;

#define NEWBIE        "/zone/fantasy/genious/newbie/"
#define WALL          NEWBIE + "wall"


void boot_this_player()
{
    tell_room( THISO, "Two burly guards suddenly appear.\n" );
    say( sprintf( "One guard points to %s and bellows, \"INTRUDER!!!\"\n" +
      "The guards drag %s away.\n", PNAME, PNAME ) );
    write( "One guard points to you and bellows, \"INTRUDER!!!\"\n" +
      "The guards drag you away.\n" );
    tell_room( WALL, sprintf(
      "%s is dragged out of the gates by a pair of burly guards.\n", PNAME ) );
    move_object( THISP, WALL );
    command( "glance", THISP );
}

/*
**  check_player() is called from within init() in all room files in which
**  player levels and weaponry are to be limited.
*/
status check_player()
{
    if( ( GetLevel( THISP ) == "mortal" )
        && ( ( to_int( THISP->query_eval() ) > 30 )
           ||( THISP->query_base_stat( "str" ) > 50 )
           ||( THISP->query_base_stat( "con" ) > 50 ) ) )
    {
        call_out( "boot_this_player", 2 );
        return( 1 );
    }
}

/* -------------------- standard room functions -------------------- */

void
init()
{
    ::init();
    check_player();
}

nomask mixed
query( string var )
{
    switch( var )
    {
        case NoPKP:
            return( 1 );
    }
    return ::query( var );
}

//  End of Newbie.h
