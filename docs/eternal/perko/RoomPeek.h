//  RoomPeek.h
//  Written by Hannah on 5/94.
//
//  Please use the following #defines as examples:
//
//  #define  OTHER_ROOM  "/zone/null/eternal/lounge/lounge"
//  #define  PRE_LIST    "Looking through the window you see "
//  #define  EMPTY_MSG   "nothing but dustballs"


string post_long()
{
    string  pl, *room_list;
    object  room, *room_inv, item;
    int     i, j;

    if( !room = FINDO( OTHER_ROOM ) )
    {
        call_other( OTHER_ROOM, "create" );
        room = FINDO( OTHER_ROOM );
    }

    room_list = ({ });
    j = sizeof( room_inv = all_inventory( room ) );
    for( i = 0; i < j; i++ )
        if( ( item = room_inv[ i ] )->short() && ( stringp( item->short() ) ) )
            room_list += ({ ( item->is_player() ?
              ( extract( item->query_name(), 0, 3 ) == "The " ?
                "the " + extract( item->query_name(), 4 ) :
                item->query_name() ) : item->short() ) });

    pl = "\n" + PRE_LIST;
    if( ( j = sizeof( room_list ) ) == 0 )
        pl += EMPTY_MSG;
    else if( j == 1 )
        pl += room_list[ 0 ];
    else if( j == 2 )
        pl += room_list[ 0 ] + " and " + room_list[ 1 ];
    else
    {
        for( i = 0; i < j - 1; i++ )
            pl += room_list[ i ] + ", ";
        pl += "and " + room_list[ j - 1 ];
    }
    pl += ".";
    return( strformat( pl ) );
}
