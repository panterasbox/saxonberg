//  cauldron.c
//  written by Hannah on 10/92

inherit ThingCode;

#define FROG_FILE  "/zone/fantasy/genious/newbie/Obj/frog"

int Potion = 1;
int Drinkable = 0;


void extra_create()
{
    set( "id", ({ "black cauldron", "cauldron" }) );
    set( "short", "a black cauldron" );
    set( "gettable", 0 );
}


string long( mixed arg )
{
    if( Potion )
        return( strformat(
          "This is a small, black cauldron filled with some sort of " +
          "bubbling, green potion." ) );
    return( "This is a small, black, empty cauldron.\n" );
}


void reset()
{
    Potion = 1;
}


void extra_init()
{
    add_action( "do_drink", "drink" );
    add_action( "do_put",   "put" );
}


status do_drink( string str )
{
    int    HPtotal, HPmax;
    object ob;

    notify_fail( "Drink what?\n" );
    if( !str || ( str != "potion" && str != "green potion" ) )
        return( 0 );
    if( !Potion )
        return( write( "There isn't any potion left.\n" ), 1 );
    if( !Drinkable )
    {
        HPtotal = THISP->query_hp();
        THISP->add_hp( -HPtotal / 2 );
        say( strformat( PNAME + " takes a drink of the green potion, and " +
                        "suddenly doubles over in pain." ) );
        return( write( "You take a drink of the green potion, and suddenly " +
                       "double over in pain!\n" ), 1 );
    }
    Potion = 0;
    HPmax = ( 2 * ( THISP->query_stat( "str" ) ) ) +
            ( 3 * ( THISP->query_stat( "con" ) ) );
    THISP->add_hp( HPmax / 2 );
    say( strformat( PNAME + " drinks all of the green potion, and suddenly " +
      "appears more energetic." ) );
    write( "You drink all of the green potion, and suddenly feel more " +
      "energetic.\n" );
    ob = present( "witch" );
    if( ob )
    {
        destruct( ob );
        tell_room( ENV( THISO ),
          "The hunchbacked witch screams, and vanishes.\n" );
    }
    return( 1 );
}


int do_put( string str )
{
    string  what, where;
    object *all, ob;
    int     i, s;

    notify_fail( "Put what where?\n" );
    if( sscanf( str, "%s in %s", what, where ) != 2 )
        return( 0 );
    if( where != "cauldron" && where != "potion" )
        return( 0 );
    if( what != "frog" && what != "little frog" )
        return( write( "You can't put that in the cauldron.\n" ), 1 );
    all = inventorya( THISP );
    for( i = 0, s = sizeof( all ); i < s; i++ )
        if( load_name( all[ i ] ) == FROG_FILE )
        {
            ob = all[ i ];
            break;
        }
    if( !ob )
        return( write( "You are not carrying a frog.\n" ), 1 );
    destruct( ob );
    if( !Potion )
    {
        say( strformat( PNAME + " puts a little frog in the empty cauldron.\n"+
          "The frog " + "vanishes." ) );
        return( write( "You put a little frog in the empty cauldron.\n" +
          "The frog vanishes.\n" ), 1 );
    }
    Drinkable = 1;
    say( PNAME + " puts a little frog in the cauldron.\n" );
    write( "You put the little frog in the cauldron.\n" );
    tell_room( ENV( THISO ),
      "The potion begins to bubble, and you think it may even be " +
      "drinkable.\n" );
    return( 1 );
}
