//  newbie/Obj/bpoop.c
//  written by Hannah on 10/92

inherit ThingCode;

int Uses = 7;


void extra_create()
{
    set( "id", ({ "bunnypoop", "bunny poop", "poop", "some bunny poop" }) );
    set( "short", "some bunny poop" );
    set( "long",
      "This is a clump of bunny poop.  You could probably throw it at " +
      "someone, with humorous results." );
    set( "weight", 100 );
    set( "value", 0 );
    set( NoSellP, 1 );
    set( NoStoreP, 1 );
}


void extra_init()
{
    add_action( "do_throw", "throw" );
}


status do_throw( string str )
{
    string victim;
    object victim_ob;

    notify_fail( "Throw what at whom?\n" );
    if( ( sscanf( str, "poop at %s", victim ) != 1 ) &&
        ( sscanf( str, "bunny poop at %s", victim ) != 1 ) )
        return( 0 );

    if( !victim_ob = FINDP ( lower_case( victim ) ) )
        return( printf( "That person cannot be found!\n" ), 1 );

    if( ENV( victim_ob ) != ENV( THISP ) )
        return( printf( "That person isn't here!\n" ), 1 );

    if( victim_ob->query_real_name() == "hannah" )
        return( printf( "Ha!  Ha!  You can't do that!\n" ), 1 );

    victim = victim_ob->query_name();
    move_object( THISO, victim_ob );
    tell_object( victim_ob,
      sprintf( "%s throws some bunny poop at you!\nSPLAT!\n", PNAME ) );
    tell_room( ENV( THISP ),
      sprintf( "%s throws some bunny poop at %s!\nSPLAT!\n", PNAME, victim ),
      ({ THISP, victim_ob }) );
    printf( "You throw some bunny poop at %s!\nSPLAT!\n", victim );
    Uses--;
    if( Uses < 1 )
    {
        tell_room( ENV( THISP ), "The bunny poop finally disintegrates.\n" );
        destruct( THISO );
    }
    return( 1 );
}
