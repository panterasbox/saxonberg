#define BOG "/usr/zippo/sword"
inherit ThingCode;
 
void extra_init()
{
    add_action( "pull", "pull" );
}
 
status pull( string str )
{
    if( str == "lever" )
    {
        if( present_path( BOG, THISP ) )
        {
            write( "You already have a zippo sword!\n" );
            return( 1 );
        }
        write( "An zippo sword appears into your inventory with a THUD!\n" );
        move_object( clone_object( BOG ), THISP );
        return( 1 );
    }
    notify_fail( "Pull what?\n" );
    return( 0 );
}

void extra_create()
{
    set( "id", ({ "dispenser" }) );
    set( "short", "a zippo sword dispenser" );
    set( "gettable", 0);
    set( "long", "This is a dispenser of zippos. <pull lever> to get "
         "your free zippo today!" );
}
