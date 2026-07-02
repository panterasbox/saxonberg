//  talisman.c
//  ++written by Hannah on 1/93++
//  This talisman gives 5 bonus pts. to the player's dexterity stat and
//  -2 bonus pts to the charisma stat.  The bonuses will only be given if
//  there aren't already bonuses for those stats, and if the player's base
//  dex is at most 20.

inherit ObjectCode;

object PlayerOb;
int    Rubbed = 0;


void extra_create()
{
    set( "id", ({ "talisman", "serpent talisman", "serpent" }) );
    set( "short", "a talisman in the shape of a serpent" );
    set( "long",
      "This is a small talisman, shaped like a serpent.  It was created " 
      "long ago by a group of demons who waged an unholy war against all "
      "Good.  One side of the talisman looks a little worn, as if it had "
      "been rubbed frequently." );
    set( "weight", 100 );    /* 2 lbs. */
    set( "value", 550 );
    set( WearableP, 1 );
}


void extra_init()
{
    add_action( "do_rub", "rub" );
    add_action( "give",   "give" );
    add_action( "put",    "put" );
}

/* Name: query()
 * Intercept ::query() for some vars.
 */
mixed
query( string var )
{
    switch( var )
    {
        case "worn":
            return( ENV( THISO ) ? ( int ) ENV( THISO )->worn( THISO ) : 0 );
            break;
    }
    return( ::query( var ) );
}

string
post_short()
{
    if( query( "worn" ) )
        return( " (worn)" );
    return( "" );
}

void
destruct_signal()
{
    if( query( "worn" ) && ENV( THISO ) )
        call_other( COMMAND_DIR + "remove", "subtract_armor", ENV( THISO ),
          THISO );
}

/*
int query_move_ok( object dest, object mover )
{
    if( query( "worn" ) && ( dest != ENV( THISO ) ) )
        call_other( COMMAND_DIR + "remove", "subtract_armor", ENV( THISO ),
          THISO );
}
*/


int query_stat_bonus( string stat )
{
    if( ENV( THISO ) != PlayerOb )
        return( 0 );
    if( Rubbed )
    {
        if (stat == "dex")
            return( 5 );
        if (stat == "chr")
            return( -2 );
    }
    return( 0 );
}


status do_rub( string str )
{
    int BASE_DEX;

    if( !str || !id( str ) )
        return( 0 );
    say( PNAME + " rubs a talisman.\n" );
    write( "You rub the talisman.\n" );

    if( THISP != ENV( THISO ) )
        return( 1 );
    if( Rubbed )
        return( 1 );
    BASE_DEX = THISP->query_base_stat( "dex" );
    if( BASE_DEX > 20 )                            /* No bonus for dex > 20. */
        return( 1 );
    if( THISP->query_stat( "dex" ) > BASE_DEX )    /* No additional bonuses. */
        return( 1 );
    Rubbed = 1;
    PlayerOb = THISP;
    PlayerOb->add_bonus_object( THISO );
    tell_room( ENV( THISP ), "It briefly glows with power.\n" );
    return( write( strformat(
      "Your body suddenly feels more dextrous.  Unfortunately, you also " 
      "feel a slight tendency towards antisocialness." ) ), 1 );
}


drop()
{
    if( !Rubbed )
        return( 0 );
    Rubbed = 0;
    if(PlayerOb)
    PlayerOb->remove_bonus_object( THISO );
    return( write( "You feel more like your old self again--slower, yet " 
      "more sociable.\n" ), 0 );
}


give()
{
    drop();
}

put()
{
    drop();
}
