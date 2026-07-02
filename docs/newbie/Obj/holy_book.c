//  Genious: newbie/Obj/holy_book.c
//  Written by Hannah on 1/93
//
//  This holy book gives 5 bonus pts. to the player's willpower stat.  The
//  bonus for willpower will only be given if there isn't already a bonus
//  for that stat, and if the player's base willpower is 20 max.

inherit ObjectCode;

#define MAX_WIL  20

object PlayerOb;
int    Read = 0;


void extra_create()
{
    set( "id", ({ "holybook", "book", "holy book" }) );
    set( "short", "a holy book" );
    set( "long",
      "This is a holy book, written many years ago by a group of shamans " +
      "who once waged a holy war against all Evil." );
    set( "weight", 250 );  // 5 lbs.
    set( "value", 550 );
}


void extra_init()
{
    add_action( "do_read", "read" );
    add_action( "give",    "give" );
    add_action( "put",     "put" );
}


int query_stat_bonus( string stat )
{
    if( stat != "wil" )
        return( 0 );
    if( ENV( THISO ) != PlayerOb )
        return( 0 );
    if( Read )
        return( 5 );
}


status do_read( string str )
{
    int  base_wil;

    notify_fail( "What do you want to read?\n" );
    if( !str || !id( str ) )
        return( 0 );
    base_wil = THISP->query_base_stat( "wil" );
    say( sprintf( "%s flips through the pages of a holy book.\n", PNAME ) );
    write( "You flip through the pages of the holy book.\n" );

    if( base_wil > MAX_WIL )  // player's wil is too high
        return( 1 );
    if( THISP->query_stat( "wil" ) > base_wil)  // player already has a bonus
        return( 1 );

    if( !Read )
    {
        Read = 1;
        PlayerOb = THISP;
        PlayerOb->add_bonus_object( THISO );
        return( printf( "The words seem to leap from the pages...\n" +
          "You feel your willpower increase a little.\n" ), 1 );
    }
    return( printf( "The written words look like gibberish to you.\n" ), 1 );
}


drop()
{
    if( !Read )
        return( 0 );
    Read = 0;
    THISP->remove_bonus_object( THISO );
    write( "You feel your willpower decrease to normal.\n" );
    return( 0 );
}


int put( string str )
{
    if( THISO->id( str ) )
        drop();
    return 0;
}

int give( string str )
{
    if( THISO->id( str ) )
        drop();
    return 0;
}
