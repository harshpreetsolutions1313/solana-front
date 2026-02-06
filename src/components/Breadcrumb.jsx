import React from "react";
import { Link } from "react-router-dom";

const Breadcrumb = ({ title }) => {
  return (
    <div className='breadcrumb mb-0 py-26 border-bottom border-gray-100'>
      <div className='container container-lg'>
        <div className='breadcrumb-wrapper flex-between flex-wrap gap-16'>
          <h6 className='mb-0'>{title}</h6>
          <ul className='flex-align gap-8 flex-wrap'>
            <li className='text-sm'>
              <Link
                to='/'
                className='text-main-two-600 flex-align gap-8 item-hover__text'
              >
                <i className='ph ph-house' />
                Home
              </Link>
            </li>
            <li className='flex-align'>
              <i className='ph ph-caret-right' />
            </li>
            <li className='text-sm'> {title} </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Breadcrumb;