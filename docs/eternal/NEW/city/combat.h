// created by Itchy @Eotl
// coded 08-02-93
 
 
/*
#define NOPKILL_SHADOW  "/zone/null/eternal/objects/nopkill_shadow"


int query_enter_ok( object me )
{
    object sh_obj;

    if( !me->query_nopkill() )
    {
        sh_obj = clone_object( NOPKILL_SHADOW );
        sh_obj->sh_init( me );
    }
}
 
int query_leave_ok( object me, object dest )
{
    string name;
    object obj;

    obj = me;
    if( !test_property( dest, "NoCombatP" ) && me->query_nopkill() )
        while( obj = shadow( obj, 0 ) )
            {
                 sscanf( file_name( obj ), "%s#", name );
                 if( name == NOPKILL_SHADOW )
                     destruct( obj );
             }
}
*/
