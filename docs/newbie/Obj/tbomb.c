//  tbomb.c
//  Written by Hannah on 11/92.
//  This is a simple time bomb that damages monsters only (i.e. no players).

inherit ObjectCode;
#define  MAX_DAMAGE 25
#define  WHOS  ( who->is_player() ? who->query_name() : \
                 ( who->query_short() ? who->query_short() : who->short() ) )


int  Set = 0;


void extra_create()
{
    set( "id", ({ "tbomb", "terrorist bomb", "bomb" }) );
    set( "short", "a terrorist bomb" );
}


string long( string str )
{
    return( strformat(
      "This is a small, black bomb.  To set it to go off, type " +
      "<set bomb>.  You have 10 seconds from the time the bomb is " +
      "set until the bomb explodes.  NOTE:  This bomb will only hurt " +
      "monsters.  Players will be unaffected by the blast.\n" +
      "The indicator light says: " + ( Set ? "ON" : "OFF" ) + "\n" ) );
}


void extra_init()
{
    add_action( "do_set", "set" );
}


status do_set( string str )
{
    int HPtotal, HPmax;
    object ob;

    notify_fail( "What do you want to set?\n" );
    if( !str || str != "bomb" )
        return( 0 );
    if( Set )
        return( write(
          "The bomb has already been set.  Cover your ears...\n" ), 1 );
    Set = 1;
    say( PNAME + " sets the switch of a terrorist bomb to ON.\n" );
    write( "You flick a switch on the bomb.  An indicator light goes on.\n" );
    call_out( "do_boom", 10, THISO );
    return( 1 );
}


status filter( object who )
{
    if( !who->is_player() && !who->query_npc() )
        return( 0 );
    return( 1 );
}


void do_boom( object this_o )
{
    int    HPtotal, i;
    object who, *room_inv;

    who = ENV( this_o );
    //  If a player or monster holds the bomb, it explodes in their hands.
    if( living( who ) )
    {
        tell_room( ENV( who ), "B O O M !!   A bomb just exploded in " +
          WHOS + "'s hands!!\n", ({ who }) );
        if( interactive( who ) )
            tell_object( who, "B O O M !!   A bomb just exploded in your " +
              "hands!!\nAmazingly, you didn't get hurt.\n" );
        if( who->query_npc() )
        {
            HPtotal = who->query_hp();
            who->add_hp( -MIN( HPtotal/2, MAX_DAMAGE ) );
            tell_room( ENV( who ), capitalize( WHOS ) +
              " suffers some damage from the blast.\n" );
        }
        destruct( this_o );
        return;
    }
    tell_room( ENV( this_o ), "B O O M !!   A bomb just exploded!!\n" );
    room_inv = filter_array( inventorya( ENV( this_o ) ), "filter" );
    for( i = 0; i < sizeof( room_inv ); i++ )
    {
        if( living( room_inv[ i ] ) )
        {
            HPtotal = room_inv[ i ]->query_hp();
            //  If victim is a player, no damage.
            if( room_inv[ i ]->is_player() )
            {
                tell_room( ENV( this_o ),
                  capitalize( room_inv[ i ]->query_name() ) +
                  " amazingly resists the force of the blast.\n",
                  ({ room_inv[ i ] }) );
                tell_object( room_inv[ i ],
                  "Fortunately, you didn't get hurt.\n" );
            }
            if( room_inv[ i ]->query_npc() )
            {
                //  Monster loses 1/2 of current hp, 25 at most.
                room_inv[ i ]->add_hp( -MIN( HPtotal/2, MAX_DAMAGE ) );
                tell_room( ENV( this_o ),
                  capitalize( room_inv[ i ]->query_short() ) +
                  " suffers some damage from the blast.\n" );
            }
        }
    }
    destruct( this_o );
}
